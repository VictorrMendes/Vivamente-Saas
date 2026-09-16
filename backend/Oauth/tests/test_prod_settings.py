import tempfile

from django.test import SimpleTestCase

from config.settings._secrets_check import collect_configuration_errors


class CollectConfigurationErrorsTests(SimpleTestCase):
    def test_flags_insecure_default_secret_key(self):
        with tempfile.NamedTemporaryFile() as tmp_file:
            errors = collect_configuration_errors(
                secret_key="changeme",
                firebase_web_api_key="real-key",
                resend_api_key="real-key",
                firebase_credentials_path=tmp_file.name,
            )

        self.assertEqual(len(errors), 1)
        self.assertIn("DJANGO_SECRET_KEY", errors[0])

    def test_flags_empty_value(self):
        with tempfile.NamedTemporaryFile() as tmp_file:
            errors = collect_configuration_errors(
                secret_key="real-secret",
                firebase_web_api_key="",
                resend_api_key="real-key",
                firebase_credentials_path=tmp_file.name,
            )

        self.assertEqual(len(errors), 1)

    def test_flags_missing_credentials_file(self):
        errors = collect_configuration_errors(
            secret_key="real-secret",
            firebase_web_api_key="real-key",
            resend_api_key="real-key",
            firebase_credentials_path="/nao/existe/arquivo.json",
        )

        self.assertEqual(len(errors), 1)

    def test_passes_when_everything_is_set(self):
        with tempfile.NamedTemporaryFile() as tmp_file:
            errors = collect_configuration_errors(
                secret_key="real-secret",
                firebase_web_api_key="real-key",
                resend_api_key="real-key",
                firebase_credentials_path=tmp_file.name,
            )

        self.assertEqual(errors, [])
