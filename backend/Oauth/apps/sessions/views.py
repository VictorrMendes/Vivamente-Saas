from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import OauthAuditLog
from apps.auth import services
from apps.auth.permissions import IsAdmin
from apps.sessions.models import OauthSession
from apps.sessions.serializers import SessionSerializer
from core.exceptions import ExternalServiceError
from core.pagination import OauthPageNumberPagination
from core.responses import success_envelope
from core.schema import RevokedSerializer, SessionRevokedSerializer, envelope_of


class SessionListView(APIView):
    @extend_schema(responses={200: envelope_of(SessionSerializer, many=True)})
    def get(self, request):
        sessions = OauthSession.objects.filter(user=request.user).order_by(
            "-created_at"
        )

        return Response(
            success_envelope(SessionSerializer(sessions, many=True).data)
        )

    @extend_schema(
        operation_id="sessions_revoke_all",
        responses={200: envelope_of(RevokedSerializer)},
    )
    def delete(self, request):
        try:
            services.revoke_refresh_tokens(request.user.firebase_uid)
        except ExternalServiceError:
            OauthAuditLog.objects.create(
                user=request.user, event="sessions_revoke_all_failed"
            )
            raise

        OauthSession.objects.filter(
            user=request.user, revoked_at__isnull=True
        ).update(revoked_at=timezone.now())

        OauthAuditLog.objects.create(
            user=request.user, event="sessions_revoked_all"
        )

        return Response(success_envelope({"revoked": True}))


class SessionDetailView(APIView):
    @extend_schema(
        operation_id="sessions_revoke_one",
        responses={200: envelope_of(SessionRevokedSerializer)},
    )
    def delete(self, request, session_id):
        session = get_object_or_404(
            OauthSession, id=session_id, user=request.user
        )
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])

        OauthAuditLog.objects.create(
            user=request.user,
            event="session_revoked",
            metadata={"session_id": session.id},
        )

        return Response(
            success_envelope(
                {
                    "revoked": True,
                    "note": (
                        "Esta sessao foi marcada como revogada apenas no "
                        "registro local. O Firebase nao suporta revogar um "
                        "unico refresh token - o idToken ja emitido pra esse "
                        "dispositivo continua valido ate expirar (~1h). Pra "
                        "revogar de verdade, use DELETE /sessions (revoga "
                        "todos os dispositivos)."
                    ),
                }
            )
        )


class SecuritySessionListView(generics.ListAPIView):
    queryset = OauthSession.objects.all().order_by("-created_at")
    serializer_class = SessionSerializer
    pagination_class = OauthPageNumberPagination
    permission_classes = [IsAdmin]
