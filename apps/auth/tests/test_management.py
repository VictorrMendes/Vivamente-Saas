from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.auth.models import OauthUser


class CreateAdminCommandTests(TestCase):
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
