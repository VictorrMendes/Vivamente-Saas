from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.auth import services
from apps.auth.models import OauthUser


class FirebaseTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None

        id_token = auth_header.removeprefix("Bearer ").strip()

        try:
            claims = services.verify_id_token(id_token)
        except services.FirebaseAuthError as exc:
            raise AuthenticationFailed(str(exc)) from exc

        try:
            user = OauthUser.objects.get(firebase_uid=claims["uid"])
        except OauthUser.DoesNotExist as exc:
            raise AuthenticationFailed("Usuario nao encontrado.") from exc

        return (user, claims)

    def authenticate_header(self, request):
        return "Bearer"
