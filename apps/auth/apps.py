from django.apps import AppConfig


class AuthConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.auth"
    label = "oauth_auth"

    def ready(self):
        from apps.auth import schema  # noqa: F401
