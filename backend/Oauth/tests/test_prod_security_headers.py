from django.test import SimpleTestCase

from config.settings import _security_headers


class SecurityHeadersTests(SimpleTestCase):
    def test_hsts_and_security_headers_configured(self):
        self.assertEqual(_security_headers.SECURE_HSTS_SECONDS, 31536000)
        self.assertTrue(_security_headers.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertTrue(_security_headers.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(_security_headers.X_FRAME_OPTIONS, "DENY")
        self.assertEqual(
            _security_headers.SECURE_PROXY_SSL_HEADER,
            ("HTTP_X_FORWARDED_PROTO", "https"),
        )


class ResolveSecureSslRedirectTests(SimpleTestCase):
    def test_defaults_to_true_when_unset(self):
        self.assertTrue(_security_headers.resolve_secure_ssl_redirect(None))

    def test_true_string_resolves_to_true(self):
        self.assertTrue(_security_headers.resolve_secure_ssl_redirect("True"))

    def test_false_string_resolves_to_false(self):
        self.assertFalse(_security_headers.resolve_secure_ssl_redirect("False"))
