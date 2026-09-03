from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.audit.models import OauthAuditLog
from apps.auth import services
from apps.auth.models import OauthUser
from apps.sessions.models import OauthSession


class RegisterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = OauthUser.objects.create(
            firebase_uid="admin_uid", email="admin@x.com", role="ADMIN"
        )
        self.therapist = OauthUser.objects.create(
            firebase_uid="therapist_uid", email="ana@x.com", role="THERAPIST"
        )

    def _authenticate_as(self, user):
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    @patch("apps.auth.views.services.create_user")
    def test_admin_can_register_user(self, mock_create_user):
        self._authenticate_as(self.admin)
        mock_create_user.return_value = OauthUser(
            firebase_uid="new_uid", email="nova@x.com", role="THERAPIST"
        )

        response = self.client.post(
            "/oauth/v1/register",
            {"email": "nova@x.com", "password": "senha123", "role": "THERAPIST"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["email"], "nova@x.com")

    def test_therapist_cannot_register_user(self):
        self._authenticate_as(self.therapist)

        response = self.client.post(
            "/oauth/v1/register",
            {"email": "nova@x.com", "password": "senha123", "role": "THERAPIST"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_register_without_token_returns_401(self):
        response = self.client.post(
            "/oauth/v1/register",
            {"email": "nova@x.com", "password": "senha123", "role": "THERAPIST"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)


class LoginViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    @patch("apps.auth.views.services.login_with_password")
    def test_successful_login_creates_session_and_audit_log(self, mock_login):
        mock_login.return_value = {
            "idToken": "id-token",
            "refreshToken": "refresh-token",
            "expiresIn": 3600,
            "firebase_uid": "uid_123",
        }

        response = self.client.post(
            "/oauth/v1/login",
            {"email": "ana@x.com", "password": "senha123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["user"]["role"], "THERAPIST")
        self.assertEqual(OauthSession.objects.count(), 1)
        self.assertEqual(OauthAuditLog.objects.filter(event="login").count(), 1)

    @patch("apps.auth.views.services.login_with_password")
    def test_wrong_password_returns_401_and_logs_failure(self, mock_login):
        mock_login.side_effect = services.FirebaseAuthError(
            "E-mail ou senha incorretos."
        )

        response = self.client.post(
            "/oauth/v1/login",
            {"email": "ana@x.com", "password": "errada"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            OauthAuditLog.objects.filter(event="login_failed").count(), 1
        )
