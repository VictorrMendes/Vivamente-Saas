import functools

import requests
from django.conf import settings
from django.db import transaction
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import CertificateFetchError, EmailAlreadyExistsError

from apps.auth import back_sync
from apps.auth.models import IdentitySyncOutbox, OauthUser
from core.exceptions import ExternalServiceError
from core.firebase import get_firebase_app

IDENTITY_TOOLKIT_SIGN_IN_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
)
SECURE_TOKEN_URL = "https://securetoken.googleapis.com/v1/token"
ACCOUNTS_UPDATE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:update"
ACCOUNTS_RESET_PASSWORD_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:resetPassword"
)


class FirebaseAuthError(ExternalServiceError):
    pass


def _post_identity_toolkit(url, **kwargs):
    try:
        return requests.post(url, timeout=10, **kwargs)
    except requests.exceptions.RequestException as exc:
        raise ExternalServiceError(
            "Falha de comunicacao com o Firebase."
        ) from exc


def _firebase_admin_call(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        get_firebase_app()
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            raise ExternalServiceError(
                "Falha de comunicacao com o Firebase."
            ) from exc

    return wrapper


def create_user(email, password, role):
    get_firebase_app()

    try:
        firebase_user = firebase_auth.create_user(email=email, password=password)
        firebase_auth.set_custom_user_claims(firebase_user.uid, {"role": role})
    except EmailAlreadyExistsError as exc:
        # Sinal especifico (nao a mensagem generica abaixo) - quem chama
        # (ex.: criar acesso a partir da fila institucional) precisa
        # distinguir "ja existe conta" de uma falha real do Firebase.
        raise ExternalServiceError("Ja existe uma conta com esse e-mail.") from exc
    except Exception as exc:
        raise ExternalServiceError(
            "Falha de comunicacao com o Firebase."
        ) from exc

    try:
        with transaction.atomic():
            user = OauthUser.objects.create(
                firebase_uid=firebase_user.uid, email=email, role=role
            )
            back_sync.enqueue_identity_event(user, IdentitySyncOutbox.PUT)
        return user
    except Exception:
        firebase_auth.delete_user(firebase_user.uid)
        raise


def login_with_password(email, password):
    response = _post_identity_toolkit(
        IDENTITY_TOOLKIT_SIGN_IN_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        json={"email": email, "password": password, "returnSecureToken": True},
    )

    if response.status_code != 200:
        raise FirebaseAuthError("E-mail ou senha incorretos.")

    payload = response.json()

    return {
        "idToken": payload["idToken"],
        "refreshToken": payload["refreshToken"],
        "expiresIn": int(payload["expiresIn"]),
        "firebase_uid": payload["localId"],
    }


def refresh_id_token(refresh_token):
    response = _post_identity_toolkit(
        SECURE_TOKEN_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
    )

    if response.status_code != 200:
        raise FirebaseAuthError("Refresh token invalido.")

    payload = response.json()

    return {
        "idToken": payload["id_token"],
        "expiresIn": int(payload["expires_in"]),
        "firebase_uid": payload["user_id"],
    }


def verify_id_token(id_token):
    get_firebase_app()

    try:
        return firebase_auth.verify_id_token(id_token, check_revoked=True)
    except CertificateFetchError as exc:
        raise ExternalServiceError(
            "Falha de comunicacao com o Firebase."
        ) from exc
    except Exception as exc:
        raise FirebaseAuthError("Token invalido ou expirado.") from exc


@_firebase_admin_call
def revoke_refresh_tokens(firebase_uid):
    firebase_auth.revoke_refresh_tokens(firebase_uid)


@_firebase_admin_call
def generate_email_verification_link(email):
    return firebase_auth.generate_email_verification_link(email)


@_firebase_admin_call
def generate_password_reset_link(email):
    return firebase_auth.generate_password_reset_link(email)


def confirm_email_verification(oob_code):
    response = _post_identity_toolkit(
        ACCOUNTS_UPDATE_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        json={"oobCode": oob_code},
    )

    if response.status_code != 200:
        raise FirebaseAuthError("Codigo de verificacao invalido ou expirado.")

    return response.json()["email"]


def confirm_password_reset(oob_code, new_password):
    response = _post_identity_toolkit(
        ACCOUNTS_RESET_PASSWORD_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        json={"oobCode": oob_code, "newPassword": new_password},
    )

    if response.status_code != 200:
        raise FirebaseAuthError("Codigo de redefinicao invalido ou expirado.")

    return response.json()["email"]


@_firebase_admin_call
def delete_user(firebase_uid):
    firebase_auth.delete_user(firebase_uid)


@_firebase_admin_call
def set_user_disabled(firebase_uid, disabled):
    firebase_auth.update_user(firebase_uid, disabled=disabled)


@_firebase_admin_call
def set_user_role(firebase_uid, role):
    firebase_auth.set_custom_user_claims(firebase_uid, {"role": role})
