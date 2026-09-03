import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "changeme")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "apps.auth",
    "apps.sessions",
    "apps.audit",
]

MIDDLEWARE = [
    "core.middleware.RequestIdMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {},
    },
]

DATABASES = {
    "default": dj_database_url.config(default="sqlite:///db.sqlite3")
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

USE_TZ = True

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

FIREBASE_CREDENTIALS_PATH = os.environ.get(
    "FIREBASE_CREDENTIALS_PATH", ".secrets/firebase-service-account.json"
)
FIREBASE_WEB_API_KEY = os.environ.get("FIREBASE_WEB_API_KEY", "")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get(
    "RESEND_FROM_EMAIL", "nao-responda@vivamenteterapias.com.br"
)

CORS_ALLOWED_ORIGINS = ALLOWED_ORIGINS

REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "core.exception_handler.oauth_exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.auth.authentication.FirebaseTokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Nao usamos django.contrib.auth (identidade e 100% Firebase), entao
    # nao deixamos o DRF tentar importar django.contrib.auth.models.AnonymousUser.
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "5/min",
        "user": "20/min",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "VivaMente Oauth API",
    "DESCRIPTION": "Servico de autenticacao e identidade da VivaMente.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
