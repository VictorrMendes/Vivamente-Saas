from unittest.mock import patch

from django.core.cache import cache
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

    @patch("apps.auth.views.services.login_with_password")
    def test_deactivated_user_cannot_login(self, mock_login):
        self.user.active = False
        self.user.save(update_fields=["active"])
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

        self.assertEqual(response.status_code, 401)


class MeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    def _authenticate(self):
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_returns_current_user(self):
        self._authenticate()

        response = self.client.get("/oauth/v1/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["email"], "ana@x.com")

    def test_denied_without_token(self):
        response = self.client.get("/oauth/v1/me")

        self.assertEqual(response.status_code, 401)


class LogoutViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_logout_logs_audit_event(self):
        response = self.client.post("/oauth/v1/logout", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(OauthAuditLog.objects.filter(event="logout").count(), 1)

    @patch("apps.auth.views.services.revoke_refresh_tokens")
    def test_logout_all_devices_revokes_tokens(self, mock_revoke):
        response = self.client.post(
            "/oauth/v1/logout", {"allDevices": True}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        mock_revoke.assert_called_once_with("uid_123")


class RefreshViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    @patch("apps.auth.views.services.refresh_id_token")
    def test_returns_new_id_token(self, mock_refresh):
        mock_refresh.return_value = {
            "idToken": "new-id-token",
            "expiresIn": 3600,
            "firebase_uid": "uid_123",
        }

        response = self.client.post(
            "/oauth/v1/refresh", {"refreshToken": "old-refresh"}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["idToken"], "new-id-token")
        self.assertNotIn("firebase_uid", response.data["data"])

    @patch("apps.auth.views.services.refresh_id_token")
    def test_invalid_refresh_token_returns_401(self, mock_refresh):
        mock_refresh.side_effect = services.FirebaseAuthError(
            "Refresh token invalido."
        )

        response = self.client.post(
            "/oauth/v1/refresh", {"refreshToken": "bad"}, format="json"
        )

        self.assertEqual(response.status_code, 401)

    @patch("apps.auth.views.services.refresh_id_token")
    def test_deactivated_user_cannot_refresh(self, mock_refresh):
        self.user.active = False
        self.user.save(update_fields=["active"])
        mock_refresh.return_value = {
            "idToken": "new-id-token",
            "expiresIn": 3600,
            "firebase_uid": "uid_123",
        }

        response = self.client.post(
            "/oauth/v1/refresh", {"refreshToken": "old-refresh"}, format="json"
        )

        self.assertEqual(response.status_code, 401)

    @patch("apps.auth.views.services.refresh_id_token")
    def test_removed_user_cannot_refresh(self, mock_refresh):
        mock_refresh.return_value = {
            "idToken": "new-id-token",
            "expiresIn": 3600,
            "firebase_uid": "uid_does_not_exist_locally",
        }

        response = self.client.post(
            "/oauth/v1/refresh", {"refreshToken": "old-refresh"}, format="json"
        )

        self.assertEqual(response.status_code, 401)


class LoginThrottleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("apps.auth.views.services.login_with_password")
    def test_sixth_login_attempt_in_a_minute_is_throttled(self, mock_login):
        mock_login.side_effect = services.FirebaseAuthError("bad creds")

        for _ in range(5):
            self.client.post(
                "/oauth/v1/login",
                {"email": "a@x.com", "password": "x"},
                format="json",
            )

        response = self.client.post(
            "/oauth/v1/login", {"email": "a@x.com", "password": "x"}, format="json"
        )

        self.assertEqual(response.status_code, 429)
        self.assertIn("Retry-After", response)


class EmailVerifyViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    @patch("apps.auth.views.services.confirm_email_verification")
    def test_confirms_verification_and_logs_audit(self, mock_confirm):
        mock_confirm.return_value = "ana@x.com"

        response = self.client.post(
            "/oauth/v1/email/verify", {"oobCode": "oob-code"}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            OauthAuditLog.objects.filter(event="email_verified").count(), 1
        )

    @patch("apps.auth.views.services.confirm_email_verification")
    def test_invalid_code_returns_400(self, mock_confirm):
        mock_confirm.side_effect = services.FirebaseAuthError("codigo invalido")

        response = self.client.post(
            "/oauth/v1/email/verify", {"oobCode": "bad-code"}, format="json"
        )

        self.assertEqual(response.status_code, 400)


class EmailResendViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    @patch("apps.auth.views.emails.send_verification_email")
    @patch("apps.auth.views.services.generate_email_verification_link")
    def test_generates_link_and_sends_email(self, mock_generate, mock_send):
        mock_generate.return_value = "https://link/verify"

        response = self.client.post("/oauth/v1/email/resend", {}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once_with("ana@x.com", "https://link/verify")

    def test_denied_without_token(self):
        self.client.credentials()

        response = self.client.post("/oauth/v1/email/resend", {}, format="json")

        self.assertEqual(response.status_code, 401)


class PasswordForgotViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    def tearDown(self):
        cache.clear()

    @patch("apps.auth.views.emails.send_password_reset_email")
    @patch("apps.auth.views.services.generate_password_reset_link")
    def test_existing_email_sends_reset_link(self, mock_generate, mock_send):
        mock_generate.return_value = "https://link/reset"

        response = self.client.post(
            "/oauth/v1/password/forgot", {"email": "ana@x.com"}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once_with("ana@x.com", "https://link/reset")

    @patch("apps.auth.views.emails.send_password_reset_email")
    @patch("apps.auth.views.services.generate_password_reset_link")
    def test_unknown_email_still_returns_success_without_sending(
        self, mock_generate, mock_send
    ):
        response = self.client.post(
            "/oauth/v1/password/forgot",
            {"email": "desconhecido@x.com"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        mock_send.assert_not_called()
        mock_generate.assert_not_called()


class PasswordResetViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    @patch("apps.auth.views.services.confirm_password_reset")
    def test_resets_password_and_logs_audit(self, mock_confirm):
        mock_confirm.return_value = "ana@x.com"

        response = self.client.post(
            "/oauth/v1/password/reset",
            {"token": "oob-code", "newPassword": "novaSenha123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            OauthAuditLog.objects.filter(event="password_reset").count(), 1
        )

    @patch("apps.auth.views.services.confirm_password_reset")
    def test_invalid_token_returns_400(self, mock_confirm):
        mock_confirm.side_effect = services.FirebaseAuthError("codigo invalido")

        response = self.client.post(
            "/oauth/v1/password/reset",
            {"token": "bad-code", "newPassword": "novaSenha123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)


class UserListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = OauthUser.objects.create(
            firebase_uid="admin_uid", email="admin@x.com", role="ADMIN"
        )
        self.therapist = OauthUser.objects.create(
            firebase_uid="therapist_uid", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.admin.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_lists_users_paginated(self):
        response = self.client.get("/oauth/v1/users")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total"], 2)
        self.assertEqual(response.data["pagination"]["per_page"], 20)

    @patch("apps.auth.views.services.create_user")
    def test_creates_user(self, mock_create_user):
        mock_create_user.return_value = OauthUser(
            firebase_uid="new_uid", email="nova@x.com", role="THERAPIST"
        )

        response = self.client.post(
            "/oauth/v1/users",
            {"email": "nova@x.com", "password": "senha123", "role": "THERAPIST"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["id"], "new_uid")


class UserDetailViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = OauthUser.objects.create(
            firebase_uid="admin_uid", email="admin@x.com", role="ADMIN"
        )
        self.therapist = OauthUser.objects.create(
            firebase_uid="therapist_uid", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.admin.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_retrieves_user_detail(self):
        response = self.client.get(f"/oauth/v1/users/{self.therapist.firebase_uid}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["email"], "ana@x.com")

    def test_deactivates_user(self):
        response = self.client.patch(
            f"/oauth/v1/users/{self.therapist.firebase_uid}",
            {"active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.therapist.refresh_from_db()
        self.assertFalse(self.therapist.active)

    @patch("apps.auth.views.services.delete_user")
    def test_deletes_user(self, mock_delete):
        response = self.client.delete(
            f"/oauth/v1/users/{self.therapist.firebase_uid}"
        )

        self.assertEqual(response.status_code, 204)
        mock_delete.assert_called_once_with("therapist_uid")
        self.assertEqual(
            OauthUser.objects.filter(firebase_uid="therapist_uid").count(), 0
        )

    def test_unknown_user_returns_404(self):
        response = self.client.get("/oauth/v1/users/does-not-exist")

        self.assertEqual(response.status_code, 404)


class RoleListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    def test_lists_available_roles(self):
        response = self.client.get("/oauth/v1/roles")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], ["ADMIN", "THERAPIST"])


class UserRoleUpdateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = OauthUser.objects.create(
            firebase_uid="admin_uid", email="admin@x.com", role="ADMIN"
        )
        self.therapist = OauthUser.objects.create(
            firebase_uid="therapist_uid", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.admin.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    @patch("apps.auth.views.services.set_user_role")
    def test_updates_role_and_logs_audit(self, mock_set_role):
        response = self.client.patch(
            f"/oauth/v1/users/{self.therapist.firebase_uid}/role",
            {"role": "ADMIN"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        mock_set_role.assert_called_once_with("therapist_uid", "ADMIN")
        self.therapist.refresh_from_db()
        self.assertEqual(self.therapist.role, "ADMIN")
        self.assertEqual(
            OauthAuditLog.objects.filter(event="role_changed").count(), 1
        )

    def test_rejects_invalid_role(self):
        response = self.client.patch(
            f"/oauth/v1/users/{self.therapist.firebase_uid}/role",
            {"role": "SUPERADMIN"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)


class TokenRevokeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        patcher = patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": self.user.firebase_uid},
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")

    @patch("apps.auth.views.services.revoke_refresh_tokens")
    def test_revokes_current_user_tokens(self, mock_revoke):
        response = self.client.post("/oauth/v1/tokens/revoke", {}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_revoke.assert_called_once_with("uid_123")
