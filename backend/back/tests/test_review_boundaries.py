from django.core.cache import cache

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.clients.models import Client
from apps.clinical_records.models import ClinicalRecord
from apps.leads.models import Lead
from apps.professionals.models import Professional
from apps.professionals.validators import RESERVED_PUBLIC_SLUGS
from tests.base import AuthenticatedAPITestCase


class ReviewBoundaryTests(AuthenticatedAPITestCase):
    def setUp(self):
        cache.clear()
        self.owner = User.objects.create(firebase_uid="owner", email="owner@example.test", role=User.THERAPIST)
        self.other = User.objects.create(firebase_uid="other", email="other@example.test", role=User.THERAPIST)
        self.prof = Professional.objects.create(user=self.owner, slug="ana", full_name="Ana", is_public=True)
        self.other_prof = Professional.objects.create(user=self.other, slug="ana-outra", full_name="Ana Outra")
        self.patient = Client.objects.create(professional=self.prof, name="Ana Paciente")
        self.other_patient = Client.objects.create(professional=self.other_prof, name="Ana Outra")
        Lead.objects.create(professional=self.prof, name="Ana Lead", email="lead@example.test")
        Lead.objects.create(professional=self.other_prof, name="Ana Outra", email="other@example.test")
        self.login(self.owner)

    def test_search_preserves_ownership_and_empty_results(self):
        for resource in ("professionals", "clients", "leads"):
            with self.subTest(resource=resource):
                response = self.client.get(f"/api/v1/{resource}?search=Inexistente")
                self.assertEqual(response.json()["data"], [])
                response = self.client.get(f"/api/v1/{resource}?search=Ana&per_page=1")
                self.assertEqual(response.json()["pagination"]["total"], 1)

    def test_reserved_slugs_rejected_on_update(self):
        for slug in (*RESERVED_PUBLIC_SLUGS, "CONTATO", "Privacidade"):
            with self.subTest(slug=slug):
                response = self.client.patch(f"/api/v1/professionals/{self.prof.pk}", {"slug": slug}, format="json")
                self.assertEqual(response.status_code, 400)
        self.prof.refresh_from_db()
        self.assertEqual(self.prof.slug, "ana")
        self.assertEqual(self.client.patch(f"/api/v1/professionals/{self.prof.pk}", {"bio": "Apresentação"}, format="json").status_code, 200)

    def test_clinical_audit_only_logs_returned_page(self):
        ClinicalRecord.objects.bulk_create([
            ClinicalRecord(client=self.patient, professional=self.prof, author=self.owner, content="Texto fictício")
            for _ in range(101)
        ])
        ClinicalRecord.objects.create(client=self.other_patient, professional=self.other_prof, content="Oculto")
        response = self.client.get(f"/api/v1/clinical-records?client={self.patient.pk}&per_page=100&page=2")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(len(data), 1)
        logs = AuditLog.objects.filter(action="view", resource="clinical_record")
        self.assertEqual(list(logs.values_list("resource_id", flat=True)), [str(data[0]["id"])])
        self.assertEqual(logs.get().metadata, {"client_id": self.patient.pk})
