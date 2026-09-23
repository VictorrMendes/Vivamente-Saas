from drf_spectacular.utils import extend_schema
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.audit.services import log_action
from config.responses import envelope
from config.mixins import ProfessionalScopedQuerysetMixin
from config.viewsets import EnvelopeModelViewSet

from . import services
from .models import Package, PackagePlan
from .serializers import (
    AssignPlanSerializer,
    PackagePlanSelfWriteSerializer,
    PackagePlanSerializer,
    PackagePlanWriteSerializer,
    PackageSelfWriteSerializer,
    PackageSerializer,
    PackageWriteSerializer,
)


class PackageViewSet(ProfessionalScopedQuerysetMixin, EnvelopeModelViewSet):
    queryset = Package.objects.select_related("professional", "client")
    filterset_fields = ["client", "status"]
    ordering_fields = ["created_at", "start_date"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return PackageSerializer
        if getattr(self, "swagger_fake_view", False):
            return PackageWriteSerializer
        if self.request.user.role != User.ADMIN:
            return PackageSelfWriteSerializer
        return PackageWriteSerializer

    def perform_create(self, serializer):
        services.create_package(self.request.user, serializer)
        log_action(self.request.user, "create", "package", serializer.instance.id)

    @extend_schema(request=AssignPlanSerializer, responses={201: PackageSerializer})
    @action(detail=False, methods=["post"])
    def assign(self, request):
        """Atribui um plano do catálogo a um cliente (cria o pacote dele)."""
        serializer = AssignPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = services.assign_plan(
            request.user, serializer.validated_data["client"], serializer.validated_data["plan"],
            serializer.validated_data.get("start_date"),
        )
        log_action(request.user, "assign_plan", "package", package.id)
        return Response(envelope(PackageSerializer(package).data, request), status=http_status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        services.update_package(serializer)
        log_action(self.request.user, "update", "package", serializer.instance.id)

    def perform_destroy(self, instance):
        log_action(self.request.user, "delete", "package", instance.id)
        instance.delete()


class PackagePlanViewSet(ProfessionalScopedQuerysetMixin, EnvelopeModelViewSet):
    """Catálogo de planos (modelos de pacote) do profissional."""

    queryset = PackagePlan.objects.select_related("professional", "service")
    filterset_fields = ["service"]
    ordering_fields = ["name", "created_at", "total_value"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return PackagePlanSerializer
        if getattr(self, "swagger_fake_view", False):
            return PackagePlanWriteSerializer
        if self.request.user.role != User.ADMIN:
            return PackagePlanSelfWriteSerializer
        return PackagePlanWriteSerializer

    def perform_create(self, serializer):
        services.create_plan(self.request.user, serializer)
        log_action(self.request.user, "create", "package_plan", serializer.instance.id)

    def perform_update(self, serializer):
        services.update_plan(serializer)
        log_action(self.request.user, "update", "package_plan", serializer.instance.id)

    def perform_destroy(self, instance):
        log_action(self.request.user, "delete", "package_plan", instance.id)
        instance.delete()
