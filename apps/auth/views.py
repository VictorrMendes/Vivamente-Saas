from rest_framework import exceptions, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.audit.models import OauthAuditLog
from apps.auth import emails, services
from apps.auth.models import OauthUser
from apps.auth.permissions import IsAdmin
from apps.auth.serializers import (
    EmailVerifySerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
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


class EmailVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            email = services.confirm_email_verification(
                serializer.validated_data["oobCode"]
            )
        except services.FirebaseAuthError as exc:
            raise exceptions.ValidationError(str(exc)) from exc

        user = OauthUser.objects.filter(email=email).first()
        OauthAuditLog.objects.create(user=user, event="email_verified")

        return Response(success_envelope({"verified": True}))


class EmailResendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        link = services.generate_email_verification_link(request.user.email)
        emails.send_verification_email(request.user.email, link)

        OauthAuditLog.objects.create(
            user=request.user, event="email_verification_sent"
        )

        return Response(success_envelope({"sent": True}))


class PasswordForgotView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = PasswordForgotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = OauthUser.objects.filter(email=email).first()
        if user is not None:
            link = services.generate_password_reset_link(email)
            emails.send_password_reset_email(email, link)
            OauthAuditLog.objects.create(
                user=user, event="password_reset_requested"
            )

        return Response(success_envelope({"sent": True}))


class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            email = services.confirm_password_reset(
                serializer.validated_data["token"],
                serializer.validated_data["newPassword"],
            )
        except services.FirebaseAuthError as exc:
            raise exceptions.ValidationError(str(exc)) from exc

        user = OauthUser.objects.filter(email=email).first()
        OauthAuditLog.objects.create(user=user, event="password_reset")

        return Response(success_envelope({"reset": True}))
