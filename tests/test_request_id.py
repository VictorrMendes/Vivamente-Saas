from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.auth.models import OauthUser


class RequestIdPropagationTests(TestCase):
    def test_health_response_has_request_id_header(self):
        response = self.client.get("/health")

        self.assertIn("X-Request-Id", response)

    def test_envelope_request_id_matches_response_header(self):
        user = OauthUser.objects.create(
            firebase_uid="uid_123", email="ana@x.com", role="THERAPIST"
        )
        client = APIClient()
        with patch(
            "apps.auth.services.verify_id_token",
            return_value={"uid": user.firebase_uid},
        ):
            client.credentials(HTTP_AUTHORIZATION="Bearer fake-token")
            response = client.get("/oauth/v1/me")

        self.assertEqual(
            response["X-Request-Id"], response.json()["meta"]["request_id"]
        )
