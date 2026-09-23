"""Confirmation links contain random, single-use capabilities, never appointment IDs."""
import hashlib
import re
import secrets
from datetime import timedelta
from urllib.parse import quote, urlsplit

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.audit.services import log_action
from .models import Appointment


class ConfirmationInput(serializers.Serializer):
    token = serializers.RegexField(r"^[A-Za-z0-9_-]{43}$", max_length=43, write_only=True)
    decision = serializers.ChoiceField(choices=["confirm", "decline"], required=False)


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


@transaction.atomic
def request_confirmation(appointment):
    appointment = Appointment.objects.select_for_update().get(pk=appointment.pk)
    now = timezone.now()
    if appointment.status != Appointment.PENDING or appointment.starts_at <= now:
        raise ValidationError("Solicite confirmação apenas de consultas futuras e pendentes.")
    phone = re.sub(r"\D", "", appointment.client.phone or "")
    if len(phone) in (10, 11):
        phone = "55" + phone
    if not 12 <= len(phone) <= 15 or phone.startswith("0"):
        raise ValidationError("Cadastre o WhatsApp do cliente com DDD e código do país.")
    base = settings.PLATFORM_PUBLIC_URL.rstrip("/")
    url = urlsplit(base)
    if not url.netloc or url.scheme not in ("http", "https") or (not settings.DEBUG and url.scheme != "https"):
        raise ValidationError("Configure o endereço público HTTPS da Plataforma.")
    token = secrets.token_urlsafe(32)
    appointment.confirmation_digest = digest(token)
    appointment.confirmation_expires_at = min(now + timedelta(hours=48), appointment.starts_at)
    appointment.confirmation_requested_at = now
    appointment.save(update_fields=["confirmation_digest", "confirmation_expires_at", "confirmation_requested_at"])
    link = f"{base}/confirmar-sessao#token={token}"
    message = "Olá! A VivaMente solicita a confirmação do seu horário. Confirme ou recuse pelo link: " + link
    return {"whatsapp_url": "https://wa.me/" + phone + "?text=" + quote(message, safe=""),
            "confirmation_url": link, "expires_at": appointment.confirmation_expires_at,
            "delivery": "MANUAL"}


@transaction.atomic
def respond(token, decision=None):
    appointment = Appointment.objects.select_for_update().filter(confirmation_digest=digest(token)).first()
    now = timezone.now()
    if (appointment is None or not appointment.professional.user.active
            or appointment.status != Appointment.PENDING or appointment.starts_at <= now
            or not appointment.confirmation_expires_at or appointment.confirmation_expires_at <= now):
        raise ValidationError("Este link expirou, já foi respondido ou o horário foi alterado. Solicite um novo link.")
    # No patient name, notes, contact, medical or internal IDs in this public response.
    result = {"starts_at": appointment.starts_at, "ends_at": appointment.ends_at,
              "professional_name": appointment.professional.full_name, "status": appointment.status}
    if decision:
        appointment.status = Appointment.CONFIRMED if decision == "confirm" else Appointment.DECLINED
        appointment.confirmation_source = "PATIENT"
        appointment.confirmation_digest = ""
        appointment.confirmation_expires_at = None
        appointment.save(update_fields=["status", "confirmation_source", "confirmation_digest", "confirmation_expires_at"])
        log_action(None, "patient_" + decision, "appointment", appointment.id)
        result["status"] = appointment.status
    return result
