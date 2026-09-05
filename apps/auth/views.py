from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import exceptions, generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.audit.models import OauthAuditLog
from apps.auth import back_sync, emails, services
from apps.auth.models import IdentitySyncOutbox, OauthUser
from apps.auth.permissions import IsAdmin
from apps.auth.serializers import (
    EmailVerifySerializer,
    LoginResponseSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
    RefreshResponseSerializer,
    RefreshSerializer,
    RegisterSerializer,
    RoleUpdateSerializer,
    UserActiveUpdateSerializer,
    UserSerializer,
)
from apps.sessions.models import OauthSession
from core.exceptions import ExternalServiceError
from core.pagination import OauthPageNumberPagination
from core.responses import success_envelope
from core.schema import (
    LoggedOutSerializer,
    ResetSerializer,
    RevokedSerializer,
    SentSerializer,
    VerifiedSerializer,
    envelope_of,
)


def _client_ip(request):
    return request.META.get("REMOTE_ADDR")


def _register_user(request_data):
    serializer = RegisterSerializer(data=request_data)
    serializer.is_valid(raise_exception=True)

    # services.create_user ja enfileira o evento de sync com o Back, na
    # mesma transacao que cria o OauthUser (ver apps/auth/services.py).
    user = services.create_user(**serializer.validated_data)

    return Response(
        success_envelope(UserSerializer(user).data),
        status=status.HTTP_201_CREATED,
    )


class RegisterView(APIView):
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    @extend_schema(
        request=RegisterSerializer, responses={201: envelope_of(UserSerializer)}
    )
    def post(self, request):
        return _register_user(request.data)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        request=LoginSerializer,
        responses={200: envelope_of(LoginResponseSerializer)},
    )
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

        try:
            user = OauthUser.objects.get(firebase_uid=tokens["firebase_uid"])
        except OauthUser.DoesNotExist:
            OauthAuditLog.objects.create(
                event="login_failed",
                ip_address=_client_ip(request),
                metadata={"email": email, "reason": "user_not_mirrored"},
            )
            raise exceptions.AuthenticationFailed("E-mail ou senha incorretos.")

        if not user.active:
            raise exceptions.AuthenticationFailed("Conta desativada.")

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

    @extend_schema(
        request=LogoutSerializer,
        responses={200: envelope_of(LoggedOutSerializer)},
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["allDevices"]:
            try:
                services.revoke_refresh_tokens(request.user.firebase_uid)
            except ExternalServiceError:
                OauthAuditLog.objects.create(
                    user=request.user, event="logout_all_devices_failed"
                )
                raise

        OauthAuditLog.objects.create(
            user=request.user, event="logout", ip_address=_client_ip(request)
        )

        return Response(success_envelope({"loggedOut": True}))


class RefreshView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=RefreshSerializer,
        responses={200: envelope_of(RefreshResponseSerializer)},
    )
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            tokens = services.refresh_id_token(
                serializer.validated_data["refreshToken"]
            )
        except services.FirebaseAuthError as exc:
            raise exceptions.AuthenticationFailed(str(exc)) from exc

        user = OauthUser.objects.filter(
            firebase_uid=tokens["firebase_uid"], active=True
        ).first()
        if user is None:
            raise exceptions.AuthenticationFailed(
                "Conta desativada ou removida."
            )

        return Response(
            success_envelope(
                {"idToken": tokens["idToken"], "expiresIn": tokens["expiresIn"]}
            )
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: envelope_of(UserSerializer)})
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

    @extend_schema(
        request=EmailVerifySerializer,
        responses={200: envelope_of(VerifiedSerializer)},
    )
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

    @extend_schema(request=None, responses={200: envelope_of(SentSerializer)})
    def post(self, request):
        try:
            link = services.generate_email_verification_link(request.user.email)
            emails.send_verification_email(request.user.email, link)
        except ExternalServiceError:
            OauthAuditLog.objects.create(
                user=request.user, event="email_verification_failed"
            )
            raise

        OauthAuditLog.objects.create(
            user=request.user, event="email_verification_sent"
        )

        return Response(success_envelope({"sent": True}))


class PasswordForgotView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        request=PasswordForgotSerializer,
        responses={200: envelope_of(SentSerializer)},
    )
    def post(self, request):
        serializer = PasswordForgotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = OauthUser.objects.filter(email=email).first()
        if user is not None:
            try:
                link = services.generate_password_reset_link(email)
                emails.send_password_reset_email(email, link)
            except ExternalServiceError:
                OauthAuditLog.objects.create(
                    user=user, event="password_reset_request_failed"
                )
                raise

            OauthAuditLog.objects.create(
                user=user, event="password_reset_requested"
            )

        return Response(success_envelope({"sent": True}))


class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetSerializer,
        responses={200: envelope_of(ResetSerializer)},
    )
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


class UserListView(generics.ListAPIView):
    queryset = OauthUser.objects.all().order_by("id")
    serializer_class = UserSerializer
    pagination_class = OauthPageNumberPagination
    permission_classes = [IsAdmin]

    @extend_schema(
        request=RegisterSerializer, responses={201: envelope_of(UserSerializer)}
    )
    def post(self, request):
        return _register_user(request.data)


class UserDetailView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses={200: envelope_of(UserSerializer)})
    def get(self, request, user_id):
        user = get_object_or_404(OauthUser, firebase_uid=user_id)

        return Response(success_envelope(UserSerializer(user).data))

    @extend_schema(
        request=UserActiveUpdateSerializer,
        responses={200: envelope_of(UserSerializer)},
    )
    def patch(self, request, user_id):
        user = get_object_or_404(OauthUser, firebase_uid=user_id)
        serializer = UserActiveUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        active = serializer.validated_data["active"]

        try:
            services.set_user_disabled(user.firebase_uid, disabled=not active)
            if not active:
                services.revoke_refresh_tokens(user.firebase_uid)
        except ExternalServiceError:
            OauthAuditLog.objects.create(
                user=user,
                event="user_active_change_failed",
                metadata={"active": active},
            )
            raise

        with transaction.atomic():
            user.active = active
            user.save(update_fields=["active"])
            back_sync.enqueue_identity_event(user, IdentitySyncOutbox.PUT)

        OauthAuditLog.objects.create(
            user=user,
            event="user_reactivated" if user.active else "user_deactivated",
        )

        return Response(success_envelope(UserSerializer(user).data))

    @extend_schema(responses={204: None})
    def delete(self, request, user_id):
        user = get_object_or_404(OauthUser, firebase_uid=user_id)

        try:
            services.delete_user(user.firebase_uid)
        except ExternalServiceError:
            OauthAuditLog.objects.create(user=user, event="user_delete_failed")
            raise

        OauthAuditLog.objects.create(
            user=user,
            event="user_deleted",
            metadata={"email": user.email, "firebase_uid": user.firebase_uid},
        )
        with transaction.atomic():
            back_sync.enqueue_identity_event(
                user, IdentitySyncOutbox.DELETE, persist_version=False
            )
            user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


_role_list_envelope = inline_serializer(
    name="RoleListEnvelope",
    fields={
        "data": serializers.ListField(
            child=serializers.ChoiceField(choices=["ADMIN", "THERAPIST"])
        ),
        "meta": serializers.DictField(),
    },
)


class RoleListView(APIView):
    @extend_schema(responses={200: _role_list_envelope})
    def get(self, request):
        return Response(success_envelope(["ADMIN", "THERAPIST"]))


class UserRoleUpdateView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=RoleUpdateSerializer,
        responses={200: envelope_of(UserSerializer)},
    )
    def patch(self, request, user_id):
        serializer = RoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data["role"]

        user = get_object_or_404(OauthUser, firebase_uid=user_id)

        try:
            services.set_user_role(user.firebase_uid, role)
        except ExternalServiceError:
            OauthAuditLog.objects.create(user=user, event="role_change_failed")
            raise

        with transaction.atomic():
            user.role = role
            user.save(update_fields=["role"])
            back_sync.enqueue_identity_event(user, IdentitySyncOutbox.PUT)

        OauthAuditLog.objects.create(
            user=user, event="role_changed", metadata={"role": role}
        )

        return Response(success_envelope(UserSerializer(user).data))


class TokenRevokeView(APIView):
    @extend_schema(request=None, responses={200: envelope_of(RevokedSerializer)})
    def post(self, request):
        try:
            services.revoke_refresh_tokens(request.user.firebase_uid)
        except ExternalServiceError:
            OauthAuditLog.objects.create(
                user=request.user, event="token_revoke_failed"
            )
            raise

        OauthAuditLog.objects.create(user=request.user, event="token_revoked")

        return Response(success_envelope({"revoked": True}))
