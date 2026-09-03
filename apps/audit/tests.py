from django.test import TestCase

from apps.auth.models import OauthUser
from apps.audit.models import OauthAuditLog


class OauthAuditLogModelTests(TestCase):
    def setUp(self):
        self.user = OauthUser.objects.create(
            firebase_uid="uid_1", email="ana@x.com", role="THERAPIST"
        )

    def test_creates_log_with_default_empty_metadata(self):
        log = OauthAuditLog.objects.create(user=self.user, event="login")

        self.assertEqual(log.metadata, {})

    def test_deleting_user_keeps_log_with_null_user(self):
        log = OauthAuditLog.objects.create(user=self.user, event="login")

        self.user.delete()
        log.refresh_from_db()

        self.assertIsNone(log.user)
