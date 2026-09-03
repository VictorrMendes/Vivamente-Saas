from django.test import SimpleTestCase
from rest_framework.exceptions import AuthenticationFailed

from core.exception_handler import oauth_exception_handler


class OauthExceptionHandlerTests(SimpleTestCase):
    def test_wraps_authentication_failed_in_envelope(self):
        response = oauth_exception_handler(AuthenticationFailed("bad creds"), {})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["status"], 401)
        self.assertEqual(response.data["detail"], "bad creds")
        self.assertIn("request_id", response.data)
