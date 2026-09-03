from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from core import firebase


class GetFirebaseAppTests(SimpleTestCase):
    def setUp(self):
        firebase._app = None

    @patch("core.firebase.firebase_admin")
    @patch("core.firebase.credentials")
    def test_initializes_app_once(self, mock_credentials, mock_firebase_admin):
        mock_cert = MagicMock()
        mock_credentials.Certificate.return_value = mock_cert
        mock_firebase_admin.initialize_app.return_value = "app-instance"

        first_call = firebase.get_firebase_app()
        second_call = firebase.get_firebase_app()

        self.assertEqual(first_call, "app-instance")
        self.assertEqual(second_call, "app-instance")
        mock_firebase_admin.initialize_app.assert_called_once_with(mock_cert)
