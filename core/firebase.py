import firebase_admin
from django.conf import settings
from firebase_admin import credentials

_app = None


def get_firebase_app():
    global _app

    if _app is None:
        cert = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _app = firebase_admin.initialize_app(cert)

    return _app
