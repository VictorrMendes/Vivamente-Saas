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

# API interna do Back (apps.accounts.internal_views) usada para sincronizar
# identidade - ver apps/auth/back_sync.py. Assinamos o JWT de servico com
# esta chave PRIVADA (RS256); o Back so tem a chave publica correspondente
# (INTERNAL_SERVICE_JWT_PUBLIC_KEY), entao nunca pode forjar um token nosso.
BACK_INTERNAL_URL = os.environ.get("BACK_INTERNAL_URL", "http://localhost:8000")
BACK_INTERNAL_SERVICE_PRIVATE_KEY = os.environ.get(
    "BACK_INTERNAL_SERVICE_PRIVATE_KEY", ""
).replace("\\n", "\n")
BACK_INTERNAL_JWT_TTL_SECONDS = int(
    os.environ.get("BACK_INTERNAL_JWT_TTL_SECONDS", "60")
)
BACK_SYNC_TIMEOUT_SECONDS = float(
    os.environ.get("BACK_SYNC_TIMEOUT_SECONDS", "3")
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
    "ENUM_NAME_OVERRIDES": {
        "OauthRole": ["ADMIN", "THERAPIST"],
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "core.logging.RequestIdFilter"},
    },
    "formatters": {
        "json": {"()": "core.logging.JsonFormatter"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "filters": ["request_id"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO"),
    },
}
