from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.auth.models import OauthUser
from apps.sessions.models import OauthSession


class SessionListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        self.other_user = OauthUser.objects.create(
            firebase_uid="uid_other", email="bia@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_lists_only_own_sessions(self):
        OauthSession.objects.create(user=self.user)
        OauthSession.objects.create(user=self.other_user)

        response = self.client.get("/oauth/v1/sessions")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 1)

    @patch("apps.sessions.views.services.revoke_refresh_tokens")
    def test_delete_revokes_all_own_sessions(self, mock_revoke):
        OauthSession.objects.create(user=self.user)
        OauthSession.objects.create(user=self.user)

        response = self.client.delete("/oauth/v1/sessions")

        self.assertEqual(response.status_code, 200)
        mock_revoke.assert_called_once_with("uid_123")
        self.assertEqual(
            OauthSession.objects.filter(
                user=self.user, revoked_at__isnull=True
            ).count(),
            0,
        )

    def test_denied_without_token(self):
        self.client.credentials()

        response = self.client.get("/oauth/v1/sessions")

        self.assertEqual(response.status_code, 401)


class SessionDetailViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        self.other_user = OauthUser.objects.create(
            firebase_uid="uid_other", email="bia@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_revokes_own_session(self):
        session = OauthSession.objects.create(user=self.user)

        response = self.client.delete(f"/oauth/v1/sessions/{session.id}")

        self.assertEqual(response.status_code, 200)
        session.refresh_from_db()
        self.assertIsNotNone(session.revoked_at)

    def test_cannot_revoke_session_of_another_user(self):
        session = OauthSession.objects.create(user=self.other_user)

        response = self.client.delete(f"/oauth/v1/sessions/{session.id}")

        self.assertEqual(response.status_code, 404)
