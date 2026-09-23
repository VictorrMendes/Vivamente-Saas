import calendar
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Exists, OuterRef
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.packages.models import Package
from config.mixins import resolve_own_professional_or_403

from .models import Appointment, AvailabilitySlot

OVERLAP_ERROR = {"starts_at": "Já existe um agendamento nesse horário para este profissional."}

ALLOWED_TRANSITIONS = {
    Appointment.PENDING: {Appointment.CONFIRMED, Appointment.CANCELLED, Appointment.DECLINED},
    # O paciente pode mudar de ideia: confirmada volta a pendente; cancelada/recusada
    # são reabertas (pendente ou já confirmada), revalidando horário e pacote.
    Appointment.CONFIRMED: {Appointment.PENDING, Appointment.IN_PROGRESS, Appointment.COMPLETED, Appointment.CANCELLED},
    Appointment.IN_PROGRESS: {Appointment.COMPLETED},
    Appointment.DECLINED: {Appointment.PENDING, Appointment.CONFIRMED},
    Appointment.CANCELLED: {Appointment.PENDING, Appointment.CONFIRMED},
    Appointment.COMPLETED: set(),
}


def create_availability_slot(user, serializer):
    if user.role == User.ADMIN:
        serializer.save()
        return
    serializer.save(professional=resolve_own_professional_or_403(user))


def _validate_ownership(professional, client, service):
    if client and client.professional_id != professional.id:
        raise ValidationError({"client": "Cliente não pertence a este profissional."})
    if service and service.professional_id != professional.id:
        raise ValidationError({"service": "Serviço não pertence a este profissional."})


def _validate_package(professional, client, package):
    if package is None:
        return
    if package.professional_id != professional.id:
        raise ValidationError({"package": "Pacote não pertence a este profissional."})
    if package.client_id != client.id:
        raise ValidationError({"package": "Pacote não pertence a este cliente."})
    if package.status != Package.ACTIVE:
        raise ValidationError({"package": "Pacote não está ativo."})
    if package.is_expired():
        raise ValidationError({"package": "Pacote expirado."})
    if package.remaining_sessions <= 0:
        raise ValidationError({"package": "Pacote sem sessões restantes."})


def _notify_if_package_low(package):
    package.refresh_from_db()
    if package.status == Package.ACTIVE and package.remaining_sessions <= 1:
        Notification.objects.create(
            user=package.professional.user,
            title="Pacote quase no fim",
            body=f'O pacote "{package.name}" tem {package.remaining_sessions} sessão(ões) restante(s).',
        )


def _validate_no_overlap(professional, starts_at, ends_at, exclude_id=None):
    conflicts = Appointment.objects.filter(
        professional=professional, starts_at__lt=ends_at, ends_at__gt=starts_at
    ).exclude(status__in=[Appointment.CANCELLED, Appointment.DECLINED])
    if exclude_id is not None:
        conflicts = conflicts.exclude(id=exclude_id)
    if conflicts.exists():
        raise ValidationError(OVERLAP_ERROR)


def _add_months(dt, months):
    month = dt.month - 1 + months
    year, month = dt.year + month // 12, month % 12 + 1
    return dt.replace(year=year, month=month, day=min(dt.day, calendar.monthrange(year, month)[1]))


# Sempre a partir da 1ª data (não da anterior): dia 31 vira 30/28 no mês curto
# mas volta ao 31 quando o mês comporta. Em horário local: mantém a hora do relógio.
_RECURRENCE_STEP = {
    "WEEKLY": lambda dt, i: dt + timedelta(weeks=i),
    "BIWEEKLY": lambda dt, i: dt + timedelta(weeks=2 * i),
    "MONTHLY": _add_months,
}


def create_appointment(user, serializer):
    """Cria a consulta; com recurrence/occurrences cria a série toda ou nada.

    serializer.instance fica sendo a 1ª consulta; serializer.series lista todas.
    """
    data = serializer.validated_data
    recurrence = data.pop("recurrence", None)
    occurrences = data.pop("occurrences", 1)
    client = data.get("client")
    service = data.get("service")
    package = data.get("package")
    starts_at = data["starts_at"]
    ends_at = data["ends_at"]

    if user.role == User.ADMIN:
        professional = data["professional"]
    else:
        professional = resolve_own_professional_or_403(user)

    _validate_ownership(professional, client, service)
    _validate_package(professional, client, package)
    if package is not None and occurrences > package.remaining_sessions:
        raise ValidationError({"package": f"Pacote com apenas {package.remaining_sessions} sessão(ões) restante(s)."})

    step = _RECURRENCE_STEP.get(recurrence)
    local_start, local_end = timezone.localtime(starts_at), timezone.localtime(ends_at)
    periods = [(starts_at, ends_at)] + [(step(local_start, i), step(local_end, i)) for i in range(1, occurrences)]
    for start, end in periods:
        _validate_no_overlap(professional, start, end)

    try:
        # savepoint proprio: se a constraint do banco rejeitar (corrida que
        # escapou do _validate_no_overlap), so essa escrita e desfeita, nao
        # a transacao inteira do request/teste. Tambem garante tudo-ou-nada da serie.
        with transaction.atomic():
            serializer.save(professional=professional)
            series = [serializer.instance]
            for start, end in periods[1:]:
                series.append(Appointment.objects.create(**{**data, "professional": professional, "starts_at": start, "ends_at": end}))
    except IntegrityError:
        raise ValidationError(OVERLAP_ERROR)
    serializer.series = series

    if package is not None:
        _notify_if_package_low(package)


def update_appointment(serializer):
    with transaction.atomic():
        serializer.instance = Appointment.objects.select_for_update().get(pk=serializer.instance.pk)
        if serializer.instance.status not in (Appointment.PENDING, Appointment.CONFIRMED):
            raise ValidationError({"status": "Somente consultas pendentes ou confirmadas podem ser editadas."})
        return _update_locked_appointment(serializer)


def _update_locked_appointment(serializer):
    instance = serializer.instance
    professional = serializer.validated_data.get("professional", instance.professional)
    client = serializer.validated_data.get("client", instance.client)
    service = serializer.validated_data.get("service", instance.service)
    starts_at = serializer.validated_data.get("starts_at", instance.starts_at)
    ends_at = serializer.validated_data.get("ends_at", instance.ends_at)

    _validate_ownership(professional, client, service)
    # So revalida o pacote quando ele esta sendo trocado nesta escrita - nao
    # queremos que uma edicao sem relacao (ex.: so as `notes`) passe a falhar
    # porque o pacote ja vinculado mudou de status depois.
    if "package" in serializer.validated_data:
        _validate_package(professional, client, serializer.validated_data["package"])
    _validate_no_overlap(professional, starts_at, ends_at, exclude_id=instance.id)
    try:
        with transaction.atomic():
            changed_schedule = any(
                key in serializer.validated_data and serializer.validated_data[key] != getattr(instance, key)
                for key in ("starts_at", "ends_at", "client", "professional", "service", "modality", "call_link")
            )
            reset = dict(status=Appointment.PENDING, confirmation_digest="", confirmation_expires_at=None,
                         confirmation_requested_at=None, confirmation_source="") if changed_schedule else {}
            serializer.save(**reset)
    except IntegrityError:
        raise ValidationError(OVERLAP_ERROR)


def list_free_slots(professional):
    """Slots publicos: is_blocked=False E sem nenhum Appointment nao-cancelado
    sobrepondo o horario (achado de auditoria - antes so olhava is_blocked)."""
    conflicting_appointment = Appointment.objects.filter(
        professional=professional,
        starts_at__lt=OuterRef("ends_at"),
        ends_at__gt=OuterRef("starts_at"),
    ).exclude(status__in=[Appointment.CANCELLED, Appointment.DECLINED])

    return (
        AvailabilitySlot.objects.filter(
            professional=professional, is_blocked=False, starts_at__gte=timezone.now()
        )
        .annotate(has_conflict=Exists(conflicting_appointment))
        .filter(has_conflict=False)
        .order_by("starts_at")
    )


@transaction.atomic
def transition_status(appointment, new_status):
    locked = Appointment.objects.select_for_update().get(pk=appointment.pk)
    if new_status == Appointment.IN_PROGRESS and locked.status == Appointment.IN_PROGRESS:
        appointment.refresh_from_db()
        return appointment
    appointment.status = locked.status
    if new_status not in ALLOWED_TRANSITIONS.get(appointment.status, set()):
        raise ValidationError(
            {"status": f"Não é possível ir de {appointment.status} para {new_status}."}
        )
    if appointment.status in (Appointment.CANCELLED, Appointment.DECLINED):
        # Cancelada/recusada não ocupava horário nem sessão: reabrir precisa de vaga de novo.
        _validate_no_overlap(appointment.professional, appointment.starts_at, appointment.ends_at, exclude_id=appointment.id)
        if appointment.package_id and appointment.package.remaining_sessions <= 0:
            raise ValidationError({"package": "Pacote sem sessões restantes."})
    appointment.status = new_status
    fields = ["status", "confirmation_digest", "confirmation_expires_at"]
    appointment.confirmation_digest = ""
    appointment.confirmation_expires_at = None
    if new_status == Appointment.IN_PROGRESS:
        appointment.started_at = timezone.now()
        fields.append("started_at")
    elif new_status == Appointment.COMPLETED:
        appointment.finished_at = timezone.now()
        fields.append("finished_at")
    elif new_status == Appointment.CONFIRMED:
        appointment.confirmation_source = "PROFESSIONAL"
        fields.append("confirmation_source")
    elif new_status == Appointment.PENDING:
        appointment.confirmation_source = ""
        appointment.confirmation_requested_at = None
        fields += ["confirmation_source", "confirmation_requested_at"]
    try:
        with transaction.atomic():
            appointment.save(update_fields=fields)
    except IntegrityError:
        raise ValidationError(OVERLAP_ERROR)
    return appointment
