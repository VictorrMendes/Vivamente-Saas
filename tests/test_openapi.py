from django.test import TestCase


class OpenApiSchemaTests(TestCase):
    def test_schema_endpoint_returns_200(self):
        response = self.client.get("/schema")

        self.assertEqual(response.status_code, 200)

    def test_docs_endpoint_returns_200(self):
        response = self.client.get("/docs")

        self.assertEqual(response.status_code, 200)
