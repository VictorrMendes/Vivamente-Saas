"""Cliente HTTP isolado para sincronizar identidade com o Back.

Nao compartilha codigo com o Back - fala com ele exclusivamente via
HTTP/REST, autenticado com um JWT de servico de vida curta (nunca um
Firebase ID Token de usuario final). Implementa o padrao outbox: todo
evento e persistido em IdentitySyncOutbox ANTES de qualquer tentativa de
rede, para nunca perder um evento por causa de uma falha transitoria.
"""

import json
import logging
import time
import uuid
from datetime import timedelta

import jwt
import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.auth.models import IdentitySyncOutbox
from core.request_id import get_request_id

logger = logging.getLogger("identity_sync")

SERVICE_ISSUER = "vivamente-oauth"
SERVICE_SUBJECT = "oauth-service"
SERVICE_AUDIENCE = "vivamente-back"
SERVICE_SCOPE = "identity:sync"

MAX_ATTEMPTS = 5
# ponytail: outbox nao tem coluna de "proxima tentativa" (schema pedido no
# ticket), entao o backoff e aproximado a partir de attempts * created_at em
# vez de um timestamp exato. Upgrade: adicionar next_attempt_at se o volume
# de retries justificar precisao melhor.
RETRY_BACKOFF_SECONDS = [5, 15, 60, 300, 900]


def _service_jwt():
    now = int(time.time())
    payload = {
        "iss": SERVICE_ISSUER,
        "sub": SERVICE_SUBJECT,
        "aud": SERVICE_AUDIENCE,
        "scope": SERVICE_SCOPE,
        "iat": now,
        "exp": now + settings.BACK_INTERNAL_JWT_TTL_SECONDS,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(
        payload, settings.BACK_INTERNAL_SERVICE_PRIVATE_KEY, algorithm="RS256"
    )


def _log(event, **fields):
    # Nunca logar token, senha, e-mail completo ou payload bruto - so
    # identificadores e metadados operacionais.
    logger.info(json.dumps({"event": event, **fields}))


def enqueue_identity_event(user, event_type, persist_version=True):
    """Persiste o evento na MESMA transacao do chamador (o chamador deve
    envolver a mutacao do OauthUser e esta chamada num unico
    transaction.atomic() - se a persistencia falhar, propaga, pro rollback
    desfazer as duas coisas juntas: nunca queremos um User alterado sem o
    evento correspondente registrado, nem vice-versa).

    O envio HTTP em si e agendado via transaction.on_commit, entao so roda
    depois que a transacao do chamador commitou de verdade - uma falha de
    rede nunca desfaz a operacao de negocio (que ja esta commitada) e nunca
    segura a transacao aberta durante o round-trip."""

    next_version = user.identity_version + 1

    if event_type == IdentitySyncOutbox.PUT:
        payload = {
            "email": user.email,
            "role": user.role,
            "active": user.active,
            "version": next_version,
            "occurred_at": timezone.now().isoformat(),
        }
    else:
        payload = {
            "version": next_version,
            "occurred_at": timezone.now().isoformat(),
        }

    with transaction.atomic():
        if persist_version:
            user.identity_version = next_version
            user.save(update_fields=["identity_version"])

        row = IdentitySyncOutbox.objects.create(
            event_type=event_type,
            firebase_uid=user.firebase_uid,
            payload=payload,
            version=next_version,
            idempotency_key=str(uuid.uuid4()),
        )

    transaction.on_commit(lambda: _try_send(row.id))
    return row


def _try_send(row_id):
    try:
        row = IdentitySyncOutbox.objects.get(id=row_id)
        _send(row)
    except Exception:
        logger.exception("identity_sync: falha inesperada ao enviar evento")


def _due_for_retry(row, now):
    if row.attempts == 0:
        return True
    idx = min(row.attempts - 1, len(RETRY_BACKOFF_SECONDS) - 1)
    delay = RETRY_BACKOFF_SECONDS[idx]
    return now >= row.created_at + timedelta(seconds=delay)


def _send(row):
    url = (
        f"{settings.BACK_INTERNAL_URL}"
        f"/api/v1/internal/identity/users/{row.firebase_uid}"
    )
    headers = {
        "Authorization": f"Bearer {_service_jwt()}",
        "Idempotency-Key": row.idempotency_key,
        "X-Request-Id": get_request_id(),
        "Content-Type": "application/json",
    }
    method = requests.put if row.event_type == IdentitySyncOutbox.PUT else requests.delete

    try:
        response = method(
            url,
            data=json.dumps(row.payload),
            headers=headers,
            timeout=settings.BACK_SYNC_TIMEOUT_SECONDS,
        )
    except requests.exceptions.RequestException as exc:
        _mark_retry(row, reason=exc.__class__.__name__)
        _log(
            "identity_sync_network_error",
            firebase_uid=row.firebase_uid,
            event_type=row.event_type,
            attempt=row.attempts,
        )
        return False

    if response.status_code < 300:
        row.status = IdentitySyncOutbox.SENT
        row.processed_at = timezone.now()
        row.last_error = ""
        row.save(update_fields=["status", "processed_at", "last_error"])
        _log(
            "identity_sync_sent",
            firebase_uid=row.firebase_uid,
            event_type=row.event_type,
            status_code=response.status_code,
        )
        return True

    if response.status_code >= 500:
        _mark_retry(row, reason=f"http_{response.status_code}")
        _log(
            "identity_sync_server_error",
            firebase_uid=row.firebase_uid,
            event_type=row.event_type,
            status_code=response.status_code,
            attempt=row.attempts,
        )
        return False

    # 4xx: evento invalido/conflitante - retry nao resolve, falha definitiva.
    row.attempts += 1
    row.status = IdentitySyncOutbox.FAILED
    row.last_error = f"http_{response.status_code}"
    row.processed_at = timezone.now()
    row.save(update_fields=["attempts", "status", "last_error", "processed_at"])
    _log(
        "identity_sync_rejected",
        firebase_uid=row.firebase_uid,
        event_type=row.event_type,
        status_code=response.status_code,
    )
    return False


def _mark_retry(row, reason):
    row.attempts += 1
    row.last_error = reason
    if row.attempts >= MAX_ATTEMPTS:
        row.status = IdentitySyncOutbox.FAILED
        row.processed_at = timezone.now()
        row.save(update_fields=["attempts", "status", "last_error", "processed_at"])
    else:
        row.save(update_fields=["attempts", "last_error"])


def process_pending(limit=100):
    """Retry em lote (via management command/cron). Processa no maximo um
    evento PENDING por firebase_uid a cada chamada, na ordem de version, pra
    nunca entregar um evento fora de ordem pro Back."""

    now = timezone.now()
    sent = 0
    blocked_uids = set()

    pending = IdentitySyncOutbox.objects.filter(status=IdentitySyncOutbox.PENDING).order_by(
        "firebase_uid", "version"
    )[:limit]

    for row in pending:
        if row.firebase_uid in blocked_uids:
            continue
        if not _due_for_retry(row, now):
            blocked_uids.add(row.firebase_uid)
            continue
        if _send(row):
            sent += 1
        else:
            blocked_uids.add(row.firebase_uid)

    return sent
