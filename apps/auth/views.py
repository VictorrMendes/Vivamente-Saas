from rest_framework import exceptions, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.audit.models import OauthAuditLog
from apps.auth import services
from apps.auth.models import OauthUser
from apps.auth.permissions import IsAdmin
from apps.auth.serializers import (
    LoginSerializer,
    LogoutSerializer,
    RefreshSerializer,
    RegisterSerializer,
)
from apps.sessions.models import OauthSession
from core.responses import success_envelope


def _client_ip(request):
    return request.META.get("REMOTE_ADDR")


class RegisterView(APIView):
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = services.create_user(**serializer.validated_data)

        return Response(
            success_envelope(
                {"id": user.firebase_uid, "email": user.email, "role": user.role}
            ),
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            tokens = services.login_with_password(email, password)
        except services.FirebaseAuthError as exc:
            OauthAuditLog.objects.create(
                event="login_failed",
                ip_address=_client_ip(request),
                metadata={"email": email},
            )
            raise exceptions.AuthenticationFailed(str(exc)) from exc

        user = OauthUser.objects.get(firebase_uid=tokens["firebase_uid"])

        OauthSession.objects.create(
            user=user,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=_client_ip(request),
        )
        OauthAuditLog.objects.create(
            user=user, event="login", ip_address=_client_ip(request)
        )

        return Response(
            success_envelope(
                {
                    "idToken": tokens["idToken"],
                    "refreshToken": tokens["refreshToken"],
                    "expiresIn": tokens["expiresIn"],
                    "user": {
                        "id": user.firebase_uid,
                        "email": user.email,
                        "role": user.role,
                    },
                }
            )
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["allDevices"]:
            services.revoke_refresh_tokens(request.user.firebase_uid)

        OauthAuditLog.objects.create(
            user=request.user, event="logout", ip_address=_client_ip(request)
        )

        return Response(success_envelope({"loggedOut": True}))


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            tokens = services.refresh_id_token(
                serializer.validated_data["refreshToken"]
            )
        except services.FirebaseAuthError as exc:
            raise exceptions.AuthenticationFailed(str(exc)) from exc

        return Response(success_envelope(tokens))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            success_envelope(
                {
                    "id": request.user.firebase_uid,
                    "email": request.user.email,
                    "role": request.user.role,
                    "active": request.user.active,
                }
            )
        )
