from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auth import services
from apps.sessions.models import OauthSession
from apps.sessions.serializers import SessionSerializer
from core.responses import success_envelope


class SessionListView(APIView):
    def get(self, request):
        sessions = OauthSession.objects.filter(user=request.user).order_by(
            "-created_at"
        )

        return Response(
            success_envelope(SessionSerializer(sessions, many=True).data)
        )

    def delete(self, request):
        services.revoke_refresh_tokens(request.user.firebase_uid)
        OauthSession.objects.filter(
            user=request.user, revoked_at__isnull=True
        ).update(revoked_at=timezone.now())

        return Response(success_envelope({"revoked": True}))


class SessionDetailView(APIView):
    def delete(self, request, session_id):
        session = get_object_or_404(
            OauthSession, id=session_id, user=request.user
        )
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])

        return Response(success_envelope({"revoked": True}))
