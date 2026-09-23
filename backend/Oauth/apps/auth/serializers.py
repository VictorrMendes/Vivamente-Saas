from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(min_length=6, max_length=128, write_only=True)
    role = serializers.ChoiceField(choices=["ADMIN", "THERAPIST"])


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True)


class LogoutSerializer(serializers.Serializer):
    allDevices = serializers.BooleanField(required=False, default=False)


class EmailVerifySerializer(serializers.Serializer):
    oobCode = serializers.CharField()


class PasswordForgotSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class PasswordResetSerializer(serializers.Serializer):
    token = serializers.CharField()
    newPassword = serializers.CharField(min_length=6, max_length=128, write_only=True)


class UserSerializer(serializers.Serializer):
    id = serializers.CharField(source="firebase_uid")
    email = serializers.EmailField()
    role = serializers.CharField()
    active = serializers.BooleanField()


class LoginUserSerializer(serializers.Serializer):
    id = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()


class LoginResponseSerializer(serializers.Serializer):
    idToken = serializers.CharField()
    expiresIn = serializers.IntegerField()
    user = LoginUserSerializer()


class RefreshResponseSerializer(serializers.Serializer):
    idToken = serializers.CharField()
    expiresIn = serializers.IntegerField()


class UserActiveUpdateSerializer(serializers.Serializer):
    active = serializers.BooleanField()


class RoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["ADMIN", "THERAPIST"])
