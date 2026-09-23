from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.clients.models import Client
from apps.packages.models import Package
from apps.professionals.models import Professional
from tests.base import AuthenticatedAPITestCase


class ReopenAppointmentTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.user = User.objects.create(firebase_uid="ther", email="t@example.com", role=User.THERAPIST)
        self.prof = Professional.objects.create(user=self.user, slug="ther", full_name="T")
        self.cli = Client.objects.create(professional=self.prof, name="Paciente")
        self.start = timezone.now() + timedelta(days=2)
        self.login(self.user)

    def _appt(self, status, start=None, **extra):
        start = start or self.start
        return Appointment.objects.create(
            professional=self.prof, client=self.cli, starts_at=start, ends_at=start + timedelta(minutes=50), status=status, **extra
        )

    def _patch(self, appt, action):
        return self.client.patch(f"/api/v1/appointments/{appt.id}/{action}")

    def test_confirmed_goes_back_to_pending_and_drops_confirmation(self):
        appt = self._appt(Appointment.CONFIRMED, confirmation_source="PATIENT")
        self.assertEqual(self._patch(appt, "reopen").status_code, 200)
        appt.refresh_from_db()
        self.assertEqual((appt.status, appt.confirmation_source), (Appointment.PENDING, ""))

    def test_cancelled_and_declined_can_be_reopened_or_confirmed(self):
        for status in (Appointment.CANCELLED, Appointment.DECLINED):
            with self.subTest(status=status):
                appt = self._appt(status)
                self.assertEqual(self._patch(appt, "reopen").status_code, 200)
                appt.refresh_from_db()
                self.assertEqual(appt.status, Appointment.PENDING)
                appt.status = status
                appt.save()
                self.assertEqual(self._patch(appt, "confirm").json()["data"]["status"], Appointment.CONFIRMED)
                appt.delete()

    def test_reopen_is_refused_when_slot_was_taken_meanwhile(self):
        cancelled = self._appt(Appointment.CANCELLED)
        self._appt(Appointment.PENDING)  # outro paciente ocupou o horário
        response = self._patch(cancelled, "reopen")
        self.assertEqual(response.status_code, 400)
        cancelled.refresh_from_db()
        self.assertEqual(cancelled.status, Appointment.CANCELLED)

    def test_reopen_is_refused_when_package_is_exhausted(self):
        pkg = Package.objects.create(professional=self.prof, client=self.cli, name="P", total_sessions=1,
                                     total_value="100.00", start_date=self.start.date())
        cancelled = self._appt(Appointment.CANCELLED, package=pkg)
        self._appt(Appointment.PENDING, start=self.start + timedelta(days=1), package=pkg)  # consumiu a única sessão
        self.assertEqual(self._patch(cancelled, "reopen").status_code, 400)

    def test_completed_and_in_progress_cannot_be_reopened(self):
        for status in (Appointment.COMPLETED, Appointment.IN_PROGRESS):
            appt = self._appt(status, start=self.start + timedelta(days=5 if status == Appointment.COMPLETED else 6))
            self.assertEqual(self._patch(appt, "reopen").status_code, 400)
