from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.auth.models import OauthUser
from apps.auth.permissions import IsAdmin


class IsAdminTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsAdmin()

    def test_allows_admin_role(self):
        request = self.factory.get("/")
        request.user = OauthUser(role="ADMIN")

        self.assertTrue(self.permission.has_permission(request, None))

    def test_denies_therapist_role(self):
        request = self.factory.get("/")
        request.user = OauthUser(role="THERAPIST")

        self.assertFalse(self.permission.has_permission(request, None))
