from datetime import timedelta
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilitySlot
from apps.clients.models import Client
from apps.professionals.models import Professional
from tests.base import AuthenticatedAPITestCase


@override_settings(PLATFORM_PUBLIC_URL="http://localhost:5173")
class ConfirmationSessionTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.therapist = User.objects.create(firebase_uid="ther", email="ther@example.com", role=User.THERAPIST)
        self.other = User.objects.create(firebase_uid="other", email="other@example.com", role=User.THERAPIST)
        self.admin = User.objects.create(firebase_uid="admin", email="admin@example.com", role=User.ADMIN)
        self.prof = Professional.objects.create(user=self.therapist, slug="ther", full_name="Terapeuta")
        Professional.objects.create(user=self.other, slug="other", full_name="Outro")
        self.patient = Client.objects.create(professional=self.prof, name="Privado", phone="(11) 99999-1234")
        start = timezone.now() + timedelta(days=1)
        self.appt = Appointment.objects.create(professional=self.prof, client=self.patient,
            starts_at=start, ends_at=start + timedelta(minutes=50), notes="Privado")
        self.url = f"/api/v1/appointments/{self.appt.id}"
        self.public = APIClient()
        self.login(self.therapist)

    def invite(self):
        response = self.client.post(self.url + "/request-confirmation", {}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        return parse_qs(urlsplit(response.data["data"]["confirmation_url"]).fragment)["token"][0]

    def respond(self, token, decision="confirm"):
        return self.public.post("/api/v1/public/appointment-confirmations/respond", {"token": token, "decision": decision}, format="json")

    def test_patient_confirmation_single_use_and_minimal_response(self):
        token = self.invite()
        self.appt.refresh_from_db()
        self.assertNotEqual(self.appt.confirmation_digest, token)
        self.assertEqual(self.appt.status, Appointment.PENDING)
        preview = self.public.post("/api/v1/public/appointment-confirmations/preview", {"token": token}, format="json")
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(set(preview.data["data"]), {"starts_at", "ends_at", "professional_name", "status"})
        self.assertEqual(self.respond(token).status_code, 200)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.status, Appointment.CONFIRMED)
        self.assertEqual(self.appt.confirmation_source, "PATIENT")
        self.assertEqual(self.respond(token, "decline").status_code, 400)
        self.assertEqual(preview["Cache-Control"], "no-store")

    def test_preview_with_decision_does_not_confirm(self):
        token = self.invite()
        self.public.post("/api/v1/public/appointment-confirmations/preview", {"token": token, "decision": "confirm"}, format="json")
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.status, Appointment.PENDING)

    def test_decline_releases_slot_and_database_constraint(self):
        AvailabilitySlot.objects.create(professional=self.prof, starts_at=self.appt.starts_at, ends_at=self.appt.ends_at)
        self.assertEqual(self.respond(self.invite(), "decline").status_code, 200)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.status, Appointment.DECLINED)
        from apps.appointments.services import list_free_slots
        self.assertEqual(list_free_slots(self.prof).count(), 1)
        Appointment.objects.create(professional=self.prof, client=self.patient, starts_at=self.appt.starts_at, ends_at=self.appt.ends_at)

    def test_reissued_or_expired_link_is_rejected(self):
        old = self.invite()
        current = self.invite()
        self.assertEqual(self.respond(old).status_code, 400)
        Appointment.objects.filter(pk=self.appt.pk).update(confirmation_expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.respond(current).status_code, 400)

    def test_reschedule_invalidates_link_and_requires_new_confirmation(self):
        token = self.invite()
        data = {"starts_at": (self.appt.starts_at + timedelta(days=1)).isoformat(), "ends_at": (self.appt.ends_at + timedelta(days=1)).isoformat()}
        self.assertEqual(self.client.patch(self.url, data, format="json").status_code, 200)
        self.assertEqual(self.respond(token).status_code, 400)
        self.client.patch(self.url + "/confirm")
        self.assertEqual(self.client.patch(self.url, {"client": self.patient.id}, format="json").data["data"]["status"], Appointment.CONFIRMED)
        data = {"starts_at": (self.appt.starts_at + timedelta(days=2)).isoformat(), "ends_at": (self.appt.ends_at + timedelta(days=2)).isoformat()}
        self.assertEqual(self.client.patch(self.url, data, format="json").data["data"]["status"], Appointment.PENDING)

    def test_cancel_and_manual_confirmation_invalidate_patient_link(self):
        token = self.invite()
        self.assertEqual(self.client.patch(self.url + "/confirm").status_code, 200)
        self.assertEqual(self.respond(token).status_code, 400)
        self.appt.refresh_from_db()
        self.assertEqual(self.appt.confirmation_source, "PROFESSIONAL")

    def test_phone_and_past_appointment_validation(self):
        self.patient.phone = "invalid"
        self.patient.save()
        self.assertEqual(self.client.post(self.url + "/request-confirmation").status_code, 400)
        self.patient.phone = "11999991234"
        self.patient.save()
        Appointment.objects.filter(pk=self.appt.pk).update(starts_at=timezone.now() - timedelta(hours=1))
        self.assertEqual(self.client.post(self.url + "/request-confirmation").status_code, 400)

    def test_foreign_therapist_and_anonymous_cannot_request_or_start(self):
        self.login(self.other)
        self.assertEqual(self.client.post(self.url + "/request-confirmation").status_code, 404)
        self.assertEqual(self.client.patch(self.url + "/start").status_code, 404)
        self.assertEqual(self.public.post(self.url + "/request-confirmation").status_code, 401)

    def test_start_requires_confirmation_and_is_idempotent_and_persistent(self):
        self.assertEqual(self.client.patch(self.url + "/start").status_code, 400)
        self.client.patch(self.url + "/confirm")
        first = self.client.patch(self.url + "/start")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["data"]["status"], Appointment.IN_PROGRESS)
        second = self.client.patch(self.url + "/start")
        self.assertEqual(first.data["data"]["started_at"], second.data["data"]["started_at"])
        self.assertEqual(self.client.get(self.url).data["data"]["started_at"], first.data["data"]["started_at"])
        self.assertEqual(self.client.patch(self.url, {"notes": "edit"}, format="json").status_code, 400)
        finished = self.client.patch(self.url + "/complete")
        self.assertEqual(finished.status_code, 200)
        self.assertIsNotNone(finished.data["data"]["finished_at"])
        self.assertEqual(self.client.patch(self.url + "/start").status_code, 400)

    def test_admin_cannot_start_or_access_clinical_record(self):
        self.login(self.admin)
        self.assertEqual(self.client.patch(self.url + "/start").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/clinical-records", {"appointment": self.appt.pk}).status_code, 403)

    def test_invalid_token_and_decision(self):
        self.assertEqual(self.respond("invalid").status_code, 400)
        self.assertEqual(self.respond(self.invite(), "start").status_code, 400)

    def test_token_and_timestamps_cannot_be_overwritten_by_client(self):
        self.invite()
        result = self.client.patch(self.url, {"status": "COMPLETED", "started_at": timezone.now().isoformat(), "confirmation_digest": "x"}, format="json")
        self.assertEqual(result.status_code, 200)
        self.assertNotIn("confirmation_digest", result.data["data"])
        self.assertIsNone(result.data["data"]["started_at"])
        self.assertEqual(result.data["data"]["status"], Appointment.PENDING)

    def test_public_throttle_is_enabled(self):
        from django.core.cache import cache
        cache.clear()
        token = self.invite()
        with patch('rest_framework.throttling.SimpleRateThrottle.get_rate', return_value='1/min'):
            self.assertEqual(self.respond(token).status_code, 200)
            self.assertEqual(self.respond(token).status_code, 429)
        cache.clear()
