from rest_framework.exceptions import ValidationError

from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from config.mixins import resolve_own_professional_or_403

from .models import Package


def _validate_ownership(professional, client, service=None):
    if client.professional_id != professional.id:
        raise ValidationError({"client": "Cliente não pertence a este profissional."})
    if service and service.professional_id != professional.id:
        raise ValidationError({"service": "Serviço não pertence a este profissional."})


def create_package(user, serializer):
    client = serializer.validated_data["client"]
    if user.role == User.ADMIN:
        professional = serializer.validated_data["professional"]
    else:
        professional = resolve_own_professional_or_403(user)
    _validate_ownership(professional, client, serializer.validated_data.get("service"))
    serializer.save(professional=professional)


def update_package(serializer):
    instance = serializer.instance
    client = serializer.validated_data.get("client", instance.client)
    _validate_ownership(instance.professional, client, serializer.validated_data.get("service", instance.service))
    serializer.save()


def create_plan(user, serializer):
    if user.role == User.ADMIN:
        professional = serializer.validated_data["professional"]
    else:
        professional = resolve_own_professional_or_403(user)
    service = serializer.validated_data.get("service")
    if service and service.professional_id != professional.id:
        raise ValidationError({"service": "Serviço não pertence a este profissional."})
    serializer.save(professional=professional)


def update_plan(serializer):
    instance = serializer.instance
    service = serializer.validated_data.get("service", instance.service)
    if service and service.professional_id != instance.professional_id:
        raise ValidationError({"service": "Serviço não pertence a este profissional."})
    serializer.save()


def assign_plan(user, client, plan, start_date=None):
    """Atribui um plano do catálogo a um cliente: cria o Pacote dele (uma cópia, o plano pode mudar depois)."""
    professional = client.professional if user.role == User.ADMIN else resolve_own_professional_or_403(user)
    if client.professional_id != professional.id:
        raise ValidationError({"client": "Cliente não pertence a este profissional."})
    if plan.professional_id != professional.id:
        raise ValidationError({"plan": "Plano não pertence a este profissional."})
    start = start_date or timezone.localdate()
    return Package.objects.create(
        professional=professional, client=client, plan=plan, service=plan.service, name=plan.name,
        total_sessions=plan.total_sessions, total_value=plan.total_value, start_date=start,
        expiration_date=start + timedelta(days=plan.validity_days) if plan.validity_days else None,
    )
