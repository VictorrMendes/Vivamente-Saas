import os

from django.core.exceptions import ImproperlyConfigured

from ._secrets_check import collect_configuration_errors
from .base import *  # noqa: F401,F403

DEBUG = False
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

_configuration_errors = collect_configuration_errors(
    secret_key=SECRET_KEY,
    firebase_web_api_key=FIREBASE_WEB_API_KEY,
    resend_api_key=RESEND_API_KEY,
    firebase_credentials_path=FIREBASE_CREDENTIALS_PATH,
)
if _configuration_errors:
    raise ImproperlyConfigured("; ".join(_configuration_errors))
