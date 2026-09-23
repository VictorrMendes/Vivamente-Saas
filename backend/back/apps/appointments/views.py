from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.audit.services import log_action
from apps.professionals.models import Professional
from config.mixins import ProfessionalScopedQuerysetMixin
from config.responses import envelope
from config.viewsets import EnvelopeModelViewSet

from . import services
from . import confirmation
from .models import Appointment, AvailabilitySlot
from .serializers import (
    AppointmentSelfWriteSerializer,
    AppointmentSerializer,
    AppointmentWriteSerializer,
    AvailabilitySlotSelfWriteSerializer,
    AvailabilitySlotSerializer,
    AvailabilitySlotWriteSerializer,
)


class AvailabilitySlotViewSet(ProfessionalScopedQuerysetMixin, EnvelopeModelViewSet):
    queryset = AvailabilitySlot.objects.select_related("professional")
    filterset_fields = ["professional", "is_blocked"]
    ordering_fields = ["starts_at"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return AvailabilitySlotSerializer
        if getattr(self, "swagger_fake_view", False):
            return AvailabilitySlotWriteSerializer
        if self.request.user.role != User.ADMIN:
            return AvailabilitySlotSelfWriteSerializer
        return AvailabilitySlotWriteSerializer

    def perform_create(self, serializer):
        services.create_availability_slot(self.request.user, serializer)
        log_action(self.request.user, "create", "availability_slot", serializer.instance.id)

    def perform_destroy(self, instance):
        log_action(self.request.user, "delete", "availability_slot", instance.id)
        instance.delete()


class AppointmentViewSet(ProfessionalScopedQuerysetMixin, EnvelopeModelViewSet):
    """Agenda interna. Filtros: professional e client (IDs), status.

    Use ordering=starts_at ou ordering=-starts_at. Os filtros restringem
    o escopo autorizado; nunca concedem acesso a outro terapeuta.
    professional_id e client_id nao sao aliases de filtros.
    """
    queryset = Appointment.objects.select_related("professional", "client", "service")
    filterset_fields = ["status", "professional", "client"]
    ordering_fields = ["starts_at", "status"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return AppointmentSerializer
        if getattr(self, "swagger_fake_view", False):
            return AppointmentWriteSerializer
        if self.request.user.role != User.ADMIN:
            return AppointmentSelfWriteSerializer
        return AppointmentWriteSerializer

    def perform_create(self, serializer):
        services.create_appointment(self.request.user, serializer)
        for appointment in serializer.series:
            log_action(self.request.user, "create", "appointment", appointment.id)

    def perform_update(self, serializer):
        services.update_appointment(serializer)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["patch"])
    def confirm(self, request, pk=None):
        return self._transition(request, Appointment.CONFIRMED)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["patch"])
    def reopen(self, request, pk=None):
        """Volta a consulta (confirmada, cancelada ou recusada) para pendente."""
        return self._transition(request, Appointment.PENDING)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        return self._transition(request, Appointment.CANCELLED)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["patch"])
    def complete(self, request, pk=None):
        return self._transition(request, Appointment.COMPLETED)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["patch"])
    def start(self, request, pk=None):
        if request.user.role != User.THERAPIST:
            raise PermissionDenied("Somente o terapeuta responsável pode iniciar o atendimento.")
        return self._transition(request, Appointment.IN_PROGRESS)

    @extend_schema(request=None, responses=inline_serializer("ConfirmationRequestResult", fields={
        "whatsapp_url": serializers.CharField(), "confirmation_url": serializers.CharField(),
        "expires_at": serializers.DateTimeField(), "delivery": serializers.CharField(),
    }))
    @action(detail=True, methods=["post"], url_path="request-confirmation")
    def request_confirmation(self, request, pk=None):
        appointment = self.get_object()
        data = confirmation.request_confirmation(appointment)
        log_action(request.user, "request_confirmation", "appointment", appointment.id)
        return Response(envelope(data, request), headers={"Cache-Control": "no-store"})

    def _transition(self, request, new_status):
        appointment = self.get_object()
        services.transition_status(appointment, new_status)
        log_action(request.user, new_status.lower(), "appointment", appointment.id)
        return Response(envelope(AppointmentSerializer(appointment).data, request))


class PublicConfirmationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public-appointment-confirmation"
    preview = False

    @extend_schema(request=confirmation.ConfirmationInput, responses=inline_serializer(
        "PublicConfirmationResult", fields={
            "starts_at": serializers.DateTimeField(), "ends_at": serializers.DateTimeField(),
            "professional_name": serializers.CharField(), "status": serializers.CharField(),
        }))
    def post(self, request):
        serializer = confirmation.ConfirmationInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not self.preview and "decision" not in data:
            raise ValidationError({"decision": "Escolha confirmar ou recusar."})
        result = confirmation.respond(data["token"], None if self.preview else data["decision"])
        return Response(envelope(result, request), headers={"Cache-Control": "no-store"})


class PublicAvailableSlotsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public-available-slots"

    @extend_schema(responses=AvailabilitySlotSerializer(many=True))
    def get(self, request, slug):
        professional = get_object_or_404(Professional, slug=slug, is_public=True, user__active=True)
        slots = services.list_free_slots(professional)
        return Response(envelope(AvailabilitySlotSerializer(slots, many=True).data, request))
