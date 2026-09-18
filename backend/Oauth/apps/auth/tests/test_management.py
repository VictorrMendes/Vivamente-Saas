from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.auth.models import OauthUser
from core.exceptions import ExternalServiceError


class CreateAdminCommandTests(TestCase):
    @patch("apps.auth.management.commands.create_admin.getpass.getpass", return_value="short")
    @patch("apps.auth.management.commands.create_admin.services.create_user")
    def test_invalid_input_does_not_call_provider(self, create_user, getpass):
        with self.assertRaises(CommandError):
            call_command("create_admin", "invalid-email")
        create_user.assert_not_called()

    @patch("apps.auth.management.commands.create_admin.getpass.getpass", return_value="senha123")
    @patch("apps.auth.management.commands.create_admin.services.create_user",
           side_effect=ExternalServiceError("provider-secret"))
    def test_provider_failure_is_sanitized(self, create_user, getpass):
        with self.assertRaises(CommandError) as caught:
            call_command("create_admin", "admin@example.test")
        self.assertNotIn("provider-secret", str(caught.exception))

    @patch("apps.auth.management.commands.create_admin.getpass.getpass")
    @patch("apps.auth.management.commands.create_admin.services.create_user")
    def test_creates_admin_user(self, mock_create_user, mock_getpass):
        mock_getpass.side_effect = ["senha123", "senha123"]
        mock_create_user.return_value = OauthUser(
            firebase_uid="uid_admin", email="admin@x.com", role="ADMIN"
        )

        call_command("create_admin", "admin@x.com")

        mock_create_user.assert_called_once_with(
            "admin@x.com", "senha123", "ADMIN"
        )

    @patch("apps.auth.management.commands.create_admin.getpass.getpass")
    def test_raises_when_passwords_dont_match(self, mock_getpass):
        mock_getpass.side_effect = ["senha123", "outrasenha"]

        with self.assertRaises(CommandError):
            call_command("create_admin", "admin@x.com")
