from drf_spectacular.extensions import OpenApiAuthenticationExtension


class FirebaseTokenAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.auth.authentication.FirebaseTokenAuthentication"
    name = "FirebaseAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "Firebase ID Token",
            "description": (
                "Token obtido em POST /oauth/v1/login ou "
                "POST /oauth/v1/refresh. Envie como "
                "'Authorization: Bearer <idToken>'."
            ),
        }
