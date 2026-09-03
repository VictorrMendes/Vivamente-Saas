from unittest.mock import patch

from django.test import TestCase
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from apps.auth import services
from apps.auth.authentication import FirebaseTokenAuthentication
from apps.auth.models import OauthUser


class FirebaseTokenAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.authenticator = FirebaseTokenAuthentication()
        self.user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )

    def test_returns_none_without_authorization_header(self):
        request = self.factory.get("/oauth/v1/me")

        self.assertIsNone(self.authenticator.authenticate(request))

    @patch("apps.auth.services.verify_id_token")
    def test_authenticates_valid_token(self, mock_verify):
        mock_verify.return_value = {"uid": "uid_123"}
        request = self.factory.get(
            "/oauth/v1/me", HTTP_AUTHORIZATION="Bearer good-token"
        )

        user, claims = self.authenticator.authenticate(request)

        self.assertEqual(user, self.user)
        self.assertEqual(claims["uid"], "uid_123")

    @patch("apps.auth.services.verify_id_token")
    def test_rejects_invalid_token(self, mock_verify):
        mock_verify.side_effect = services.FirebaseAuthError("bad token")
        request = self.factory.get(
            "/oauth/v1/me", HTTP_AUTHORIZATION="Bearer bad-token"
        )

        with self.assertRaises(AuthenticationFailed):
            self.authenticator.authenticate(request)

    @patch("apps.auth.services.verify_id_token")
    def test_rejects_token_for_unknown_user(self, mock_verify):
        mock_verify.return_value = {"uid": "uid_unknown"}
        request = self.factory.get(
            "/oauth/v1/me", HTTP_AUTHORIZATION="Bearer good-token"
        )

        with self.assertRaises(AuthenticationFailed):
            self.authenticator.authenticate(request)
