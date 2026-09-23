from datetime import date, timedelta

from apps.accounts.models import User
from apps.clients.models import Client
from apps.packages.models import Package, PackagePlan
from apps.professionals.models import Professional
from apps.services.models import Service
from tests.base import AuthenticatedAPITestCase


class PackagePlanTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.user_a = User.objects.create(firebase_uid="ther-a", email="a@teste.com", role=User.THERAPIST)
        self.user_b = User.objects.create(firebase_uid="ther-b", email="b@teste.com", role=User.THERAPIST)
        self.prof_a = Professional.objects.create(user=self.user_a, slug="terapeuta-a", full_name="A")
        self.prof_b = Professional.objects.create(user=self.user_b, slug="terapeuta-b", full_name="B")
        self.client_a = Client.objects.create(professional=self.prof_a, name="Cliente A")
        self.client_b = Client.objects.create(professional=self.prof_b, name="Cliente B")
        self.service_a = Service.objects.create(professional=self.prof_a, name="Terapia", duration_minutes=50, price="150.00")
        self.service_b = Service.objects.create(professional=self.prof_b, name="Outra", duration_minutes=50, price="90.00")
        self.login(self.user_a)

    def _plan_payload(self, **extra):
        return {"name": "Plano 4 sessões", "service": self.service_a.id, "total_sessions": 4,
                "total_value": "600.00", "validity_days": 60, **extra}

    def test_therapist_creates_plan_for_self_without_client(self):
        response = self.client.post("/api/v1/package-plans", self._plan_payload(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["data"]["professional"], self.prof_a.id)

    def test_plan_validation_and_service_ownership(self):
        self.assertEqual(self.client.post("/api/v1/package-plans", self._plan_payload(total_sessions=0), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/package-plans", self._plan_payload(total_value="-1"), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/package-plans", self._plan_payload(service=self.service_b.id), format="json").status_code, 400)

    def test_catalog_is_private_per_professional(self):
        PackagePlan.objects.create(professional=self.prof_b, name="Do B", total_sessions=2, total_value="100.00")
        mine = self.client.post("/api/v1/package-plans", self._plan_payload(), format="json").json()["data"]
        listed = self.client.get("/api/v1/package-plans").json()["data"]
        self.assertEqual([p["id"] for p in listed], [mine["id"]])

    def test_assign_copies_plan_into_client_package(self):
        plan = PackagePlan.objects.create(professional=self.prof_a, service=self.service_a, name="Plano 4", total_sessions=4,
                                          total_value="600.00", validity_days=30)
        response = self.client.post("/api/v1/packages/assign", {"client": self.client_a.id, "plan": plan.id, "start_date": "2027-01-10"}, format="json")
        self.assertEqual(response.status_code, 201)
        pkg = Package.objects.get(pk=response.json()["data"]["id"])
        self.assertEqual((pkg.plan_id, pkg.service_id, pkg.name, pkg.total_sessions), (plan.id, self.service_a.id, "Plano 4", 4))
        self.assertEqual(pkg.start_date, date(2027, 1, 10))
        self.assertEqual(pkg.expiration_date, date(2027, 1, 10) + timedelta(days=30))
        self.assertEqual(pkg.status, Package.ACTIVE)

    def test_assign_refuses_foreign_client_or_plan(self):
        plan_b = PackagePlan.objects.create(professional=self.prof_b, name="B", total_sessions=2, total_value="100.00")
        plan_a = PackagePlan.objects.create(professional=self.prof_a, name="A", total_sessions=2, total_value="100.00")
        self.assertEqual(self.client.post("/api/v1/packages/assign", {"client": self.client_a.id, "plan": plan_b.id}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/packages/assign", {"client": self.client_b.id, "plan": plan_a.id}, format="json").status_code, 400)
        self.assertEqual(Package.objects.count(), 0)

    def test_deleting_plan_keeps_packages_already_assigned(self):
        plan = PackagePlan.objects.create(professional=self.prof_a, name="Plano", total_sessions=2, total_value="100.00")
        pkg_id = self.client.post("/api/v1/packages/assign", {"client": self.client_a.id, "plan": plan.id}, format="json").json()["data"]["id"]
        self.assertEqual(self.client.delete(f"/api/v1/package-plans/{plan.id}").status_code, 204)
        pkg = Package.objects.get(pk=pkg_id)
        self.assertEqual((pkg.plan_id, pkg.name), (None, "Plano"))
