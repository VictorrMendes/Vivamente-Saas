from django.test import SimpleTestCase

from apps.auth.serializers import (
    EmailVerifySerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
    RefreshSerializer,
    RegisterSerializer,
)


class RegisterSerializerTests(SimpleTestCase):
    def test_valid_payload(self):
        serializer = RegisterSerializer(
            data={"email": "a@x.com", "password": "senha123", "role": "THERAPIST"}
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_invalid_role(self):
        serializer = RegisterSerializer(
            data={"email": "a@x.com", "password": "senha123", "role": "SUPERADMIN"}
        )

        self.assertFalse(serializer.is_valid())

    def test_rejects_short_password(self):
        serializer = RegisterSerializer(
            data={"email": "a@x.com", "password": "123", "role": "ADMIN"}
        )

        self.assertFalse(serializer.is_valid())


class LoginSerializerTests(SimpleTestCase):
    def test_valid_payload(self):
        serializer = LoginSerializer(data={"email": "a@x.com", "password": "x"})

        self.assertTrue(serializer.is_valid())

    def test_rejects_invalid_email(self):
        serializer = LoginSerializer(data={"email": "not-an-email", "password": "x"})

        self.assertFalse(serializer.is_valid())


class RefreshSerializerTests(SimpleTestCase):
    def test_requires_refresh_token(self):
        serializer = RefreshSerializer(data={})

        self.assertFalse(serializer.is_valid())


class LogoutSerializerTests(SimpleTestCase):
    def test_all_devices_defaults_to_false(self):
        serializer = LogoutSerializer(data={})
        serializer.is_valid()

        self.assertFalse(serializer.validated_data["allDevices"])


class EmailVerifySerializerTests(SimpleTestCase):
    def test_requires_oob_code(self):
        serializer = EmailVerifySerializer(data={})

        self.assertFalse(serializer.is_valid())


class PasswordForgotSerializerTests(SimpleTestCase):
    def test_requires_valid_email(self):
        serializer = PasswordForgotSerializer(data={"email": "not-an-email"})

        self.assertFalse(serializer.is_valid())


class PasswordResetSerializerTests(SimpleTestCase):
    def test_rejects_short_new_password(self):
        serializer = PasswordResetSerializer(
            data={"token": "oob-code", "newPassword": "123"}
        )

        self.assertFalse(serializer.is_valid())

    def test_valid_payload(self):
        serializer = PasswordResetSerializer(
            data={"token": "oob-code", "newPassword": "novaSenha123"}
        )

        self.assertTrue(serializer.is_valid())
