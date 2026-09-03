from unittest.mock import patch

from django.test import SimpleTestCase

from apps.auth import emails


class SendVerificationEmailTests(SimpleTestCase):
    @patch("apps.auth.emails.resend.Emails.send")
    def test_sends_email_with_link(self, mock_send):
        emails.send_verification_email("ana@x.com", "https://link/verify")

        args = mock_send.call_args[0][0]
        self.assertEqual(args["to"], ["ana@x.com"])
        self.assertIn("https://link/verify", args["html"])


class SendPasswordResetEmailTests(SimpleTestCase):
    @patch("apps.auth.emails.resend.Emails.send")
    def test_sends_email_with_link(self, mock_send):
        emails.send_password_reset_email("ana@x.com", "https://link/reset")

        args = mock_send.call_args[0][0]
        self.assertEqual(args["to"], ["ana@x.com"])
        self.assertIn("https://link/reset", args["html"])
