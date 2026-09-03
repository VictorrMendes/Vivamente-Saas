from django.test import TestCase, override_settings


@override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:3000"])
class CorsTests(TestCase):
    def test_allowed_origin_gets_cors_header(self):
        response = self.client.get("/health", HTTP_ORIGIN="http://localhost:3000")

        self.assertEqual(
            response["Access-Control-Allow-Origin"], "http://localhost:3000"
        )
