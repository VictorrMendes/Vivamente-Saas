from django.db import IntegrityError
from django.test import TestCase

from apps.auth.models import OauthUser


class OauthUserModelTests(TestCase):
    def test_creates_user_with_default_active_true(self):
        user = OauthUser.objects.create(
            firebase_uid="uid_123",
            email="ana@vivamenteterapias.com.br",
            role="THERAPIST",
        )

        self.assertTrue(user.active)

    def test_firebase_uid_is_unique(self):
        OauthUser.objects.create(
            firebase_uid="uid_dup", email="a@x.com", role="ADMIN"
        )

        with self.assertRaises(IntegrityError):
            OauthUser.objects.create(
                firebase_uid="uid_dup", email="b@x.com", role="THERAPIST"
            )
