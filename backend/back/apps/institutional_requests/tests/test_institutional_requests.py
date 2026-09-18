import threading

from django.db import connection
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.institutional_requests import services as institutional_services
from apps.institutional_requests.models import InstitutionalRequest
from apps.leads.models import Lead
from apps.professionals.models import Professional
from tests.base import AuthenticatedAPITestCase


@override_settings(DEBUG=True)
class PublicInstitutionalRequestCreateTests(APITestCase):
    def test_patient_request_created_without_auth(self):
        response = self.client.post(
            "/api/v1/public/institutional-requests",
            {"kind": "PATIENT", "name": "Joana", "email": "joana@teste.com", "message": "Preciso de indicação"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        inquiry = InstitutionalRequest.objects.get()
        self.assertEqual(inquiry.kind, InstitutionalRequest.PATIENT)
        self.assertEqual(inquiry.status, InstitutionalRequest.NEW)

    def test_therapist_interest_created_without_auth(self):
        response = self.client.post(
            "/api/v1/public/institutional-requests",
            {"kind": "THERAPIST_INTEREST", "name": "Dra. Ana", "email": "ana@teste.com", "message": "Quero participar"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(InstitutionalRequest.objects.get().kind, InstitutionalRequest.THERAPIST_INTEREST)

    def test_response_does_not_echo_contact_data(self):
        response = self.client.post(
            "/api/v1/public/institutional-requests",
            {"kind": "PATIENT", "name": "Joana", "email": "joana@teste.com", "message": "Segredo"},
            format="json",
        )
        body = response.json()["data"]
        self.assertEqual(set(body), {"id", "status"})

    def test_rejects_invalid_kind(self):
        response = self.client.post(
            "/api/v1/public/institutional-requests",
            {"kind": "PACIENTE", "name": "X", "email": "x@teste.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class InstitutionalRequestQueueAccessTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.admin = User.objects.create(firebase_uid="admin-1", email="admin@teste.com", role=User.ADMIN)
        self.therapist = User.objects.create(firebase_uid="ther-a", email="a@teste.com", role=User.THERAPIST)
        self.inquiry = InstitutionalRequest.objects.create(
            kind=InstitutionalRequest.PATIENT, name="Joana", email="joana@teste.com"
        )

    def test_unauthenticated_cannot_list(self):
        response = self.client.get("/api/v1/institutional-requests")
        self.assertEqual(response.status_code, 401)

    def test_therapist_cannot_list(self):
        self.login(self.therapist)
        response = self.client.get("/api/v1/institutional-requests")
        self.assertEqual(response.status_code, 403)

    def test_admin_lists_queue(self):
        self.login(self.admin)
        response = self.client.get("/api/v1/institutional-requests")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 1)


class InstitutionalRequestForwardTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.admin = User.objects.create(firebase_uid="admin-1", email="admin@teste.com", role=User.ADMIN)
        self.therapist = User.objects.create(firebase_uid="ther-a", email="a@teste.com", role=User.THERAPIST)
        self.professional = Professional.objects.create(
            user=self.therapist, slug="terapeuta-a", full_name="Terapeuta A", is_public=True
        )
        self.inactive_therapist = User.objects.create(
            firebase_uid="ther-b", email="b@teste.com", role=User.THERAPIST, active=False
        )
        self.inactive_professional = Professional.objects.create(
            user=self.inactive_therapist, slug="terapeuta-b", full_name="Terapeuta B", is_public=True
        )
        self.inquiry = InstitutionalRequest.objects.create(
            kind=InstitutionalRequest.PATIENT, name="Joana", email="joana@teste.com", message="Preciso de ajuda"
        )
        self.login(self.admin)

    def test_forwards_to_active_professional_creates_lead(self):
        response = self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.professional.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "FORWARDED")
        lead = Lead.objects.get()
        self.assertEqual(lead.professional, self.professional)
        self.assertEqual(lead.name, "Joana")

    def test_repeating_forward_does_not_duplicate_lead(self):
        self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.professional.id},
            format="json",
        )
        response = self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.professional.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 1)

    def test_cannot_forward_to_inactive_professional(self):
        response = self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.inactive_professional.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)

    def test_cannot_forward_therapist_interest(self):
        interest = InstitutionalRequest.objects.create(
            kind=InstitutionalRequest.THERAPIST_INTEREST, name="Dra. Ana", email="ana@teste.com"
        )
        response = self.client.post(
            f"/api/v1/institutional-requests/{interest.id}/forward",
            {"professional": self.professional.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_therapist_cannot_forward(self):
        self.login(self.therapist)
        response = self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.professional.id},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_status_change_after_forward_cannot_reopen_it_for_a_second_forward(self):
        # Reproducao original: forward -> status muda por outra rota -> forward
        # de novo criava um segundo Lead, porque a checagem so olhava status
        # == FORWARDED (que a propria mudanca de status tinha acabado de sair).
        first = self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.professional.id}, format="json",
        )
        self.assertEqual(first.status_code, 200)

        changed = self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status",
            {"status": "IN_PROGRESS"}, format="json",
        )
        self.assertEqual(changed.status_code, 400, "FORWARDED é terminal: nada deveria conseguir tirar dela")

        repeated = self.client.post(
            f"/api/v1/institutional-requests/{self.inquiry.id}/forward",
            {"professional": self.professional.id}, format="json",
        )
        self.assertEqual(repeated.status_code, 400)
        self.assertEqual(Lead.objects.count(), 1)

        self.inquiry.refresh_from_db()
        self.assertEqual(self.inquiry.status, "FORWARDED")
        self.assertEqual(self.inquiry.forwarded_to, self.professional)
        self.assertIsNotNone(self.inquiry.forwarded_lead)
        self.assertIsNotNone(self.inquiry.forwarded_at)


class InstitutionalRequestStatusTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.admin = User.objects.create(firebase_uid="admin-1", email="admin@teste.com", role=User.ADMIN)
        self.inquiry = InstitutionalRequest.objects.create(
            kind=InstitutionalRequest.THERAPIST_INTEREST, name="Dra. Ana", email="ana@teste.com"
        )
        self.login(self.admin)

    def test_admin_advances_status(self):
        response = self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status", {"status": "IN_PROGRESS"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.inquiry.refresh_from_db()
        self.assertEqual(self.inquiry.status, InstitutionalRequest.IN_PROGRESS)

    def test_cannot_set_forwarded_via_status_endpoint(self):
        response = self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status", {"status": "FORWARDED"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_closed_is_terminal(self):
        self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status", {"status": "CLOSED"}, format="json"
        )
        response = self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status", {"status": "IN_PROGRESS"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_cannot_go_back_from_in_progress_to_new(self):
        self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status", {"status": "IN_PROGRESS"}, format="json"
        )
        response = self.client.patch(
            f"/api/v1/institutional-requests/{self.inquiry.id}/status", {"status": "NEW"}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class InstitutionalRequestConcurrencyTests(TransactionTestCase):
    """Prova que o select_for_update em forward_to_professional/change_status
    (services.py) realmente impede: (a) dois forwards simultaneos duplicarem
    o Lead, e (b) um forward e uma mudanca de status simultaneos corromperem
    o resultado. TransactionTestCase (nao TestCase) porque precisa de
    transacoes/conexoes de verdade pra o lock entre threads fazer sentido -
    mesmo padrao de apps/leads/tests/test_concurrency.py."""

    def setUp(self):
        self.admin = User.objects.create(firebase_uid="admin-1", email="admin@teste.com", role=User.ADMIN)
        self.therapist = User.objects.create(firebase_uid="ther-a", email="a@teste.com", role=User.THERAPIST)
        self.professional = Professional.objects.create(
            user=self.therapist, slug="terapeuta-a", full_name="Terapeuta A", is_public=True
        )
        self.inquiry = InstitutionalRequest.objects.create(
            kind=InstitutionalRequest.PATIENT, name="Joana", email="joana@teste.com"
        )

    def test_two_simultaneous_forwards_create_only_one_lead(self):
        errors = []

        def attempt_forward():
            try:
                institutional_services.forward_to_professional(self.admin, self.inquiry, self.professional)
            except Exception as exc:  # noqa: BLE001 - queremos capturar qualquer falha da thread
                errors.append(exc)
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt_forward) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(Lead.objects.filter(professional=self.professional).count(), 1)
        self.assertEqual(len(errors), 1)
        self.inquiry.refresh_from_db()
        self.assertEqual(self.inquiry.status, InstitutionalRequest.FORWARDED)
        self.assertIsNotNone(self.inquiry.forwarded_lead_id)

    def test_forward_racing_status_change_never_duplicates_or_corrupts(self):
        errors = []

        def attempt_forward():
            try:
                institutional_services.forward_to_professional(self.admin, self.inquiry, self.professional)
            except Exception as exc:  # noqa: BLE001
                errors.append(("forward", exc))
            finally:
                connection.close()

        def attempt_status_change():
            try:
                institutional_services.change_status(self.admin, self.inquiry, InstitutionalRequest.IN_PROGRESS)
            except Exception as exc:  # noqa: BLE001
                errors.append(("status", exc))
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt_forward), threading.Thread(target=attempt_status_change)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Ordem entre as duas threads nao e garantida, mas o resultado final
        # precisa ser consistente de qualquer jeito: no maximo 1 Lead, e se
        # o forward venceu a corrida, os campos de encaminhamento batem com
        # esse unico Lead (nunca um Lead "orfao" nem forwarded_lead apontando
        # pra outro registro).
        self.assertLessEqual(Lead.objects.filter(professional=self.professional).count(), 1)
        self.inquiry.refresh_from_db()
        if self.inquiry.status == InstitutionalRequest.FORWARDED:
            self.assertIsNotNone(self.inquiry.forwarded_lead_id)
            self.assertEqual(Lead.objects.filter(pk=self.inquiry.forwarded_lead_id).count(), 1)
        else:
            self.assertIsNone(self.inquiry.forwarded_lead_id)
