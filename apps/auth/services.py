import requests
from django.conf import settings
from firebase_admin import auth as firebase_auth

from apps.auth.models import OauthUser
from core.firebase import get_firebase_app

IDENTITY_TOOLKIT_SIGN_IN_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
)
SECURE_TOKEN_URL = "https://securetoken.googleapis.com/v1/token"
ACCOUNTS_UPDATE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:update"
ACCOUNTS_RESET_PASSWORD_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:resetPassword"
)


class FirebaseAuthError(Exception):
    pass


def create_user(email, password, role):
    get_firebase_app()
    firebase_user = firebase_auth.create_user(email=email, password=password)
    firebase_auth.set_custom_user_claims(firebase_user.uid, {"role": role})

    return OauthUser.objects.create(
        firebase_uid=firebase_user.uid, email=email, role=role
    )


def login_with_password(email, password):
    response = requests.post(
        IDENTITY_TOOLKIT_SIGN_IN_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=10,
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
    response = requests.post(
        SECURE_TOKEN_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=10,
    )

    if response.status_code != 200:
        raise FirebaseAuthError("Refresh token invalido.")

    payload = response.json()

    return {
        "idToken": payload["id_token"],
        "expiresIn": int(payload["expires_in"]),
    }


def verify_id_token(id_token):
    get_firebase_app()

    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception as exc:
        raise FirebaseAuthError("Token invalido ou expirado.") from exc


def revoke_refresh_tokens(firebase_uid):
    get_firebase_app()
    firebase_auth.revoke_refresh_tokens(firebase_uid)


def generate_email_verification_link(email):
    get_firebase_app()
    return firebase_auth.generate_email_verification_link(email)


def generate_password_reset_link(email):
    get_firebase_app()
    return firebase_auth.generate_password_reset_link(email)


def confirm_email_verification(oob_code):
    response = requests.post(
        ACCOUNTS_UPDATE_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        json={"oobCode": oob_code},
        timeout=10,
    )

    if response.status_code != 200:
        raise FirebaseAuthError("Codigo de verificacao invalido ou expirado.")

    return response.json()["email"]


def confirm_password_reset(oob_code, new_password):
    response = requests.post(
        ACCOUNTS_RESET_PASSWORD_URL,
        params={"key": settings.FIREBASE_WEB_API_KEY},
        json={"oobCode": oob_code, "newPassword": new_password},
        timeout=10,
    )

    if response.status_code != 200:
        raise FirebaseAuthError("Codigo de redefinicao invalido ou expirado.")

    return response.json()["email"]


def delete_user(firebase_uid):
    get_firebase_app()
    firebase_auth.delete_user(firebase_uid)
