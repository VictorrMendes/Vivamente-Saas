from django.test import TestCase

from apps.auth.models import OauthUser
from apps.audit.models import OauthAuditLog


class OauthAuditLogModelTests(TestCase):
    def setUp(self):
        self.user = OauthUser.objects.create(
            firebase_uid="uid_1", email="ana@x.com", role="THERAPIST"
        )

    def test_creates_log_with_only_request_id_in_metadata_by_default(self):
        log = OauthAuditLog.objects.create(user=self.user, event="login")

        self.assertEqual(set(log.metadata.keys()), {"request_id"})

    def test_deleting_user_keeps_log_with_null_user(self):
        log = OauthAuditLog.objects.create(user=self.user, event="login")

        self.user.delete()
        log.refresh_from_db()

        self.assertIsNone(log.user)


class OauthAuditLogManagerTests(TestCase):
    def test_create_injects_request_id_into_metadata(self):
        log = OauthAuditLog.objects.create(event="login")

        self.assertIn("request_id", log.metadata)
        self.assertTrue(log.metadata["request_id"].startswith("req_"))

    def test_create_respects_explicit_request_id(self):
        log = OauthAuditLog.objects.create(
            event="login", metadata={"request_id": "req_explicito"}
        )

        self.assertEqual(log.metadata["request_id"], "req_explicito")
