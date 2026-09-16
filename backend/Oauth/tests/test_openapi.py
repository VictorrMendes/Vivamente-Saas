from django.test import TestCase


class OpenApiSchemaTests(TestCase):
    def test_schema_endpoint_returns_200(self):
        response = self.client.get("/schema")

        self.assertEqual(response.status_code, 200)

    def test_docs_endpoint_returns_200(self):
        response = self.client.get("/docs")

        self.assertEqual(response.status_code, 200)


class OpenApiSchemaCompletenessTests(TestCase):
    """Trava que o schema seja um contrato de verdade, nao so 200 no /schema.

    generate_schema() emite warnings via warnings.warn quando encontra uma
    view sem serializer ou um autenticador nao registrado - se algum desses
    voltar (ex: alguem adiciona uma view nova sem @extend_schema), esse
    teste falha.
    """

    def test_schema_generates_with_no_warnings(self):
        from drf_spectacular.drainage import GENERATOR_STATS
        from drf_spectacular.generators import SchemaGenerator

        GENERATOR_STATS.reset()
        schema = SchemaGenerator().get_schema(request=None, public=True)

        self.assertEqual(dict(GENERATOR_STATS._warn_cache), {})
        self.assertEqual(dict(GENERATOR_STATS._error_cache), {})
        self.assertIsNotNone(schema)

    def test_bearer_auth_scheme_is_documented(self):
        from drf_spectacular.generators import SchemaGenerator

        schema = SchemaGenerator().get_schema(request=None, public=True)

        security_schemes = schema["components"]["securitySchemes"]
        self.assertIn("FirebaseAuth", security_schemes)
        self.assertEqual(security_schemes["FirebaseAuth"]["scheme"], "bearer")

    def test_login_endpoint_has_request_and_response_bodies(self):
        from drf_spectacular.generators import SchemaGenerator

        schema = SchemaGenerator().get_schema(request=None, public=True)

        login_post = schema["paths"]["/oauth/v1/login"]["post"]
        self.assertIn("requestBody", login_post)
        self.assertIn("200", login_post["responses"])

    def test_protected_endpoint_declares_security_requirement(self):
        from drf_spectacular.generators import SchemaGenerator

        schema = SchemaGenerator().get_schema(request=None, public=True)

        me_get = schema["paths"]["/oauth/v1/me"]["get"]
        self.assertIn("security", me_get)
