from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from config.responses import envelope
from config.viewsets import EnvelopeRetrieveMixin

from . import services
from .models import InstitutionalRequest
from .serializers import (
    InstitutionalRequestForwardSerializer,
    InstitutionalRequestPublicCreateSerializer,
    InstitutionalRequestSerializer,
    InstitutionalRequestStatusSerializer,
)


class InstitutionalRequestPublicCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public-institutional-requests"

    @extend_schema(request=InstitutionalRequestPublicCreateSerializer, responses={201: InstitutionalRequestPublicCreateSerializer})
    def post(self, request):
        serializer = InstitutionalRequestPublicCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = serializer.save()
        # Confirmacao minima: nao ecoa email/telefone/mensagem que o
        # visitante acabou de enviar (mesmo padrao de leads/views.py).
        return Response(envelope({"id": inquiry.id, "status": inquiry.status}, request), status=201)


class InstitutionalRequestViewSet(
    EnvelopeRetrieveMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Fila institucional - so a equipe (ADMIN) enxerga. Terapeutas nunca
    veem esses dados antes de um encaminhamento virar Lead deles."""

    queryset = InstitutionalRequest.objects.select_related("forwarded_to", "forwarded_lead")
    serializer_class = InstitutionalRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ["kind", "status"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "status"]

    @extend_schema(request=InstitutionalRequestStatusSerializer, responses=InstitutionalRequestSerializer)
    @action(detail=True, methods=["patch"], url_path="status")
    def set_status(self, request, pk=None):
        inquiry = self.get_object()
        # Sem instance, e sem partial: `status` e o unico campo deste
        # serializer e e sempre obrigatorio aqui - partial=True faria o DRF
        # aceitar corpo vazio como "nada mudou" (gerava 500 adiante, ver
        # validated_data["status"] em KeyError). A transicao de verdade (o
        # que é permitido a partir do status atual) é decidida sob lock em
        # services.change_status, nao aqui - o status atual pode ter mudado
        # entre o get_object() acima e a chamada abaixo.
        serializer = InstitutionalRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.change_status(request.user, inquiry, serializer.validated_data["status"])
        return Response(envelope(InstitutionalRequestSerializer(updated).data, request))

    @extend_schema(request=InstitutionalRequestForwardSerializer, responses=InstitutionalRequestSerializer)
    @action(detail=True, methods=["post"])
    def forward(self, request, pk=None):
        inquiry = self.get_object()
        serializer = InstitutionalRequestForwardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.forward_to_professional(request.user, inquiry, serializer.validated_data["professional"])
        return Response(envelope(InstitutionalRequestSerializer(updated).data, request))
