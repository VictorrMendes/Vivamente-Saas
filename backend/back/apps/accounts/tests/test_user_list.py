from apps.accounts.models import User
from tests.base import AuthenticatedAPITestCase


class UserListViewTests(AuthenticatedAPITestCase):
    def setUp(self):
        self.admin = User.objects.create(firebase_uid="admin-1", email="admin@teste.com", role=User.ADMIN)
        self.therapist = User.objects.create(
            firebase_uid="ther-1", email="ana.terapeuta@teste.com", role=User.THERAPIST
        )
        User.objects.create(firebase_uid="ther-2", email="outra@teste.com", role=User.THERAPIST)

    def test_admin_can_search_user_by_email(self):
        self.login(self.admin)
        response = self.client.get("/api/v1/users?search=ana.terapeuta")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.therapist.id)
        self.assertEqual(data[0]["email"], "ana.terapeuta@teste.com")

    def test_response_has_only_userserializer_fields(self):
        self.login(self.admin)
        response = self.client.get("/api/v1/users?search=ana.terapeuta")
        data = response.json()["data"][0]
        self.assertEqual(
            set(data.keys()),
            {"id", "firebase_uid", "email", "role", "active", "created_at", "updated_at"},
        )

    def test_therapist_cannot_list_users(self):
        self.login(self.therapist)
        response = self.client.get("/api/v1/users")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get("/api/v1/users")
        self.assertEqual(response.status_code, 401)

    def test_paginated_envelope(self):
        self.login(self.admin)
        response = self.client.get("/api/v1/users")
        body = response.json()
        self.assertIn("pagination", body)
        self.assertEqual(len(body["data"]), 3)
