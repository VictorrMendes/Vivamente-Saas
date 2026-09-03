from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.auth import services
from apps.auth.models import OauthUser


class CreateUserTests(TestCase):
    @patch("apps.auth.services.get_firebase_app")
    @patch("apps.auth.services.firebase_auth")
    def test_creates_firebase_user_and_local_mirror(
        self, mock_firebase_auth, mock_get_app
    ):
        mock_firebase_user = MagicMock(uid="uid_123")
        mock_firebase_auth.create_user.return_value = mock_firebase_user

        user = services.create_user("ana@x.com", "senha123", "THERAPIST")

        mock_firebase_auth.set_custom_user_claims.assert_called_once_with(
            "uid_123", {"role": "THERAPIST"}
        )
        self.assertEqual(user.firebase_uid, "uid_123")
        self.assertEqual(OauthUser.objects.count(), 1)


class LoginWithPasswordTests(TestCase):
    @patch("apps.auth.services.requests.post")
    def test_returns_tokens_on_success(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "idToken": "id-token",
                "refreshToken": "refresh-token",
                "expiresIn": "3600",
                "localId": "uid_123",
            },
        )

        result = services.login_with_password("ana@x.com", "senha123")

        self.assertEqual(result["idToken"], "id-token")
        self.assertEqual(result["expiresIn"], 3600)
        self.assertEqual(result["firebase_uid"], "uid_123")

    @patch("apps.auth.services.requests.post")
    def test_raises_on_invalid_credentials(self, mock_post):
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {})

        with self.assertRaises(services.FirebaseAuthError):
            services.login_with_password("ana@x.com", "wrong")


class RefreshIdTokenTests(TestCase):
    @patch("apps.auth.services.requests.post")
    def test_returns_new_id_token(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"id_token": "new-id-token", "expires_in": "3600"},
        )

        result = services.refresh_id_token("refresh-token")

        self.assertEqual(result["idToken"], "new-id-token")
        self.assertEqual(result["expiresIn"], 3600)

    @patch("apps.auth.services.requests.post")
    def test_raises_on_invalid_refresh_token(self, mock_post):
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {})

        with self.assertRaises(services.FirebaseAuthError):
            services.refresh_id_token("bad-refresh-token")


class VerifyIdTokenTests(TestCase):
    @patch("apps.auth.services.get_firebase_app")
    @patch("apps.auth.services.firebase_auth")
    def test_returns_decoded_claims(self, mock_firebase_auth, mock_get_app):
        mock_firebase_auth.verify_id_token.return_value = {"uid": "uid_123"}

        claims = services.verify_id_token("id-token")

        self.assertEqual(claims["uid"], "uid_123")

    @patch("apps.auth.services.get_firebase_app")
    @patch("apps.auth.services.firebase_auth")
    def test_raises_on_invalid_token(self, mock_firebase_auth, mock_get_app):
        mock_firebase_auth.verify_id_token.side_effect = ValueError("bad token")

        with self.assertRaises(services.FirebaseAuthError):
            services.verify_id_token("bad-token")


class RevokeRefreshTokensTests(TestCase):
    @patch("apps.auth.services.get_firebase_app")
    @patch("apps.auth.services.firebase_auth")
    def test_calls_admin_sdk_revoke(self, mock_firebase_auth, mock_get_app):
        services.revoke_refresh_tokens("uid_123")

        mock_firebase_auth.revoke_refresh_tokens.assert_called_once_with("uid_123")
