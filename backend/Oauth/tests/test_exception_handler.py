from django.test import SimpleTestCase
from rest_framework.exceptions import AuthenticationFailed

from core.exception_handler import oauth_exception_handler
from core.exceptions import ExternalServiceError


class OauthExceptionHandlerTests(SimpleTestCase):
    def test_wraps_authentication_failed_in_envelope(self):
        response = oauth_exception_handler(AuthenticationFailed("bad creds"), {})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["status"], 401)
        self.assertEqual(response.data["detail"], "bad creds")
        self.assertIn("request_id", response.data)


class OauthExceptionHandlerExternalServiceTests(SimpleTestCase):
    def test_wraps_external_service_error_as_502(self):
        response = oauth_exception_handler(
            ExternalServiceError("Firebase fora do ar"), {}
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["status"], 502)
        self.assertEqual(response.data["detail"], "Firebase fora do ar")


class OauthExceptionHandlerCatchAllTests(SimpleTestCase):
    def test_wraps_unexpected_exception_as_500(self):
        response = oauth_exception_handler(ValueError("boom"), {})

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["status"], 500)
        self.assertNotIn("boom", response.data["detail"])
