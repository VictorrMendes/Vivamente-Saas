from django.db import models

from apps.leads.models import Lead
from apps.professionals.models import Professional


class InstitutionalRequest(models.Model):
    """Contato pela empresa, sem terapeuta escolhido: paciente pedindo
    indicação, ou terapeuta manifestando interesse em entrar na rede.

    Entidade separada do Lead de propósito — Lead.professional continua
    obrigatório (um lead sempre pertence a um terapeuta). Encaminhar uma
    solicitação PATIENT cria um Lead de verdade; THERAPIST_INTEREST nunca
    cria conta nem Lead, só é acompanhada pela equipe (ver services.py)."""

    PATIENT = "PATIENT"
    THERAPIST_INTEREST = "THERAPIST_INTEREST"
    KIND_CHOICES = [
        (PATIENT, "Paciente buscando indicação"),
        (THERAPIST_INTEREST, "Terapeuta interessado em participar"),
    ]

    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    FORWARDED = "FORWARDED"
    CLOSED = "CLOSED"
    STATUS_CHOICES = [
        (NEW, "Novo"),
        (IN_PROGRESS, "Em acompanhamento"),
        (FORWARDED, "Encaminhado"),
        (CLOSED, "Encerrado"),
    ]

    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NEW)

    forwarded_to = models.ForeignKey(
        Professional, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="institutional_requests",
    )
    forwarded_lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    forwarded_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "institutional_requests"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "kind"], name="idx_instreq_status_kind")]

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()}, {self.status})"
