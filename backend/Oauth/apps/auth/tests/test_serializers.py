from django.test import SimpleTestCase

from apps.auth.serializers import (
    EmailVerifySerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
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


def _errors(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid()
    return serializer.errors


class InputLengthLimitTests(SimpleTestCase):
    def test_email_and_password_have_upper_bounds(self):
        long_email = "a" * 250 + "@x.com"
        self.assertIn("email", _errors(LoginSerializer, {"email": long_email, "password": "x"}))
        self.assertIn("email", _errors(PasswordForgotSerializer, {"email": long_email}))
        self.assertIn("password", _errors(LoginSerializer, {"email": "a@x.com", "password": "x" * 129}))
        self.assertIn("newPassword", _errors(PasswordResetSerializer, {"token": "t", "newPassword": "x" * 129}))
        self.assertNotIn("password", _errors(LoginSerializer, {"email": "a@x.com", "password": "x" * 128}))
