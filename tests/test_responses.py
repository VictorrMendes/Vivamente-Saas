from django.test import SimpleTestCase

from core.responses import error_envelope, success_envelope


class SuccessEnvelopeTests(SimpleTestCase):
    def test_wraps_data_with_meta(self):
        envelope = success_envelope({"id": 1})

        self.assertEqual(envelope["data"], {"id": 1})
        self.assertTrue(envelope["meta"]["request_id"].startswith("req_"))
        self.assertIn("timestamp", envelope["meta"])


class ErrorEnvelopeTests(SimpleTestCase):
    def test_builds_rfc9457_shape(self):
        envelope = error_envelope(
            type_suffix="invalid-credentials",
            title="Invalid Credentials",
            status_code=401,
            detail="E-mail ou senha incorretos.",
        )

        self.assertEqual(envelope["status"], 401)
        self.assertEqual(
            envelope["type"],
            "https://api.vivamenteterapias.com.br/errors/invalid-credentials",
        )
        self.assertEqual(envelope["errors"], [])
        self.assertTrue(envelope["request_id"].startswith("req_"))
