from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    role = serializers.ChoiceField(choices=["ADMIN", "THERAPIST"])


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RefreshSerializer(serializers.Serializer):
    refreshToken = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    allDevices = serializers.BooleanField(required=False, default=False)


class EmailVerifySerializer(serializers.Serializer):
    oobCode = serializers.CharField()


class PasswordForgotSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetSerializer(serializers.Serializer):
    token = serializers.CharField()
    newPassword = serializers.CharField(min_length=6, write_only=True)


class UserSerializer(serializers.Serializer):
    id = serializers.CharField(source="firebase_uid")
    email = serializers.EmailField()
    role = serializers.CharField()
    active = serializers.BooleanField()
