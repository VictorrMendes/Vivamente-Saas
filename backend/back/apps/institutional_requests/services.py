from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.services import log_action
from apps.leads.models import Lead
from apps.leads.services import notify_professional_of_new_lead

from .models import InstitutionalRequest

# Maquina de estados explicita: FORWARDED so e alcancavel via
# forward_to_professional (nunca por PATCH /status) e e terminal - nada sai
# dela por change_status. Uma solicitacao fechada tambem nao pode ser
# reaberta nem encaminhada.
VALID_STATUS_TRANSITIONS = {
    InstitutionalRequest.NEW: {InstitutionalRequest.IN_PROGRESS, InstitutionalRequest.CLOSED},
    InstitutionalRequest.IN_PROGRESS: {InstitutionalRequest.CLOSED},
    InstitutionalRequest.CLOSED: set(),
    InstitutionalRequest.FORWARDED: set(),
}


def change_status(user, inquiry, new_status):
    with transaction.atomic():
        # Mesmo lock de forward_to_professional: as duas funcoes disputam a
        # mesma linha, entao uma nunca ve o estado "no meio" da outra - e o
        # bug real (status mudava por fora, sem o forward saber) fica
        # impossivel por construcao, nao só pela checagem de transicao.
        locked = InstitutionalRequest.objects.select_for_update().get(pk=inquiry.pk)
        allowed = VALID_STATUS_TRANSITIONS.get(locked.status, set())
        if new_status not in allowed:
            raise ValidationError({"status": f"Não é possível mudar de {locked.status} para {new_status}."})
        locked.status = new_status
        locked.save(update_fields=["status", "updated_at"])

    log_action(user, "status_change", "institutional_request", locked.id, {"status": new_status})
    return locked


def forward_to_professional(admin_user, inquiry, professional):
    with transaction.atomic():
        # select_for_update trava a linha: repetir a acao no mesmo pedido
        # (duplo clique, duas abas, ou uma corrida com change_status) nunca
        # cria um segundo Lead - a segunda chamada so entra aqui depois que a
        # primeira commitou, mesmo padrao de apps/leads/services.py::convert_to_client.
        locked = InstitutionalRequest.objects.select_for_update().get(pk=inquiry.pk)
        if locked.kind != InstitutionalRequest.PATIENT:
            raise ValidationError({"kind": "Só solicitações de pacientes podem ser encaminhadas."})
        # forwarded_lead e a prova duravel de que ja foi encaminhado - checar
        # so o status seria fragil a qualquer mudanca futura na maquina de
        # estados acima (ou a um dado antigo/editado manualmente). A prova
        # real e ter ou nao um Lead associado, independente do status atual.
        if locked.forwarded_lead_id is not None:
            raise ValidationError({"status": "Esta solicitação já foi encaminhada."})
        if locked.status not in (InstitutionalRequest.NEW, InstitutionalRequest.IN_PROGRESS):
            raise ValidationError({"status": "Esta solicitação está encerrada e não pode mais ser encaminhada."})

        lead = Lead.objects.create(
            professional=professional,
            name=locked.name,
            email=locked.email,
            phone=locked.phone,
            message=locked.message,
        )
        locked.status = InstitutionalRequest.FORWARDED
        locked.forwarded_to = professional
        locked.forwarded_lead = lead
        locked.forwarded_at = timezone.now()
        locked.save(update_fields=["status", "forwarded_to", "forwarded_lead", "forwarded_at", "updated_at"])

    # Auditoria sem dado sensivel: so os IDs, nunca nome/email/mensagem do contato.
    log_action(
        admin_user, "forward", "institutional_request", locked.id,
        {"professional_id": professional.id, "lead_id": lead.id},
    )
    notify_professional_of_new_lead(lead)
    return locked
