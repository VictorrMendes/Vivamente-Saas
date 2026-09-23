from datetime import datetime, timedelta, timezone as dt_timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.clients.models import Client
from apps.packages.models import Package
from apps.professionals.models import Professional
from tests.base import AuthenticatedAPITestCase

START = datetime(2027, 1, 31, 13, 0, tzinfo=dt_timezone.utc)  # 10:00 em São Paulo


class AppointmentRecurrenceTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.user = User.objects.create(firebase_uid="ther-a", email="a@teste.com", role=User.THERAPIST)
        self.prof = Professional.objects.create(user=self.user, slug="terapeuta-a", full_name="A")
        self.cli = Client.objects.create(professional=self.prof, name="Cliente A")
        self.login(self.user)

    def _post(self, **extra):
        payload = {
            "client": self.cli.id,
            "starts_at": START.isoformat(),
            "ends_at": (START + timedelta(minutes=50)).isoformat(),
            **extra,
        }
        return self.client.post("/api/v1/appointments", payload, format="json")

    def _starts(self):
        return list(Appointment.objects.order_by("starts_at").values_list("starts_at", flat=True))

    def test_weekly_repeats_same_weekday_and_time(self):
        response = self._post(recurrence="WEEKLY", occurrences=3)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self._starts(), [START + timedelta(weeks=i) for i in range(3)])

    def test_biweekly_steps_two_weeks(self):
        self._post(recurrence="BIWEEKLY", occurrences=3)
        self.assertEqual(self._starts(), [START + timedelta(weeks=2 * i) for i in range(3)])

    def test_monthly_clamps_short_months_and_recovers(self):
        self._post(recurrence="MONTHLY", occurrences=3)  # 31/jan, 28/fev, 31/mar
        self.assertEqual([(d.month, d.day) for d in self._starts()], [(1, 31), (2, 28), (3, 31)])

    def test_series_is_all_or_nothing_on_overlap(self):
        Appointment.objects.create(
            professional=self.prof, client=self.cli, starts_at=START + timedelta(weeks=2), ends_at=START + timedelta(weeks=2, minutes=50)
        )
        response = self._post(recurrence="WEEKLY", occurrences=4)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Appointment.objects.count(), 1)

    def test_series_cannot_exceed_package_sessions(self):
        pkg = Package.objects.create(
            professional=self.prof, client=self.cli, name="P", total_sessions=2, total_value="200.00", start_date=START.date()
        )
        response = self._post(recurrence="WEEKLY", occurrences=3, package=pkg.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("sessão(ões) restante(s)", response.content.decode())
        self.assertEqual(Appointment.objects.count(), 0)

    def test_recurrence_requires_occurrences_and_is_create_only(self):
        self.assertEqual(self._post(recurrence="WEEKLY").status_code, 400)
        self.assertEqual(self._post(recurrence="DAILY", occurrences=3).status_code, 400)
        created = self._post().json()["data"]
        patch = self.client.patch(f"/api/v1/appointments/{created['id']}", {"recurrence": "WEEKLY", "occurrences": 2}, format="json")
        self.assertEqual(patch.status_code, 400)
