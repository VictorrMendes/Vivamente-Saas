from django.test import TestCase

from apps.auth.models import OauthUser
from apps.sessions.models import OauthSession


class OauthSessionModelTests(TestCase):
    def setUp(self):
        self.user = OauthUser.objects.create(
            firebase_uid="uid_1", email="ana@x.com", role="THERAPIST"
        )

    def test_creates_session_linked_to_user(self):
        session = OauthSession.objects.create(
            user=self.user, user_agent="pytest-agent", ip_address="127.0.0.1"
        )

        self.assertIsNone(session.revoked_at)
        self.assertEqual(session.user, self.user)

    def test_deleting_user_cascades_to_sessions(self):
        OauthSession.objects.create(user=self.user)

        self.user.delete()

        self.assertEqual(OauthSession.objects.count(), 0)
