from rest_framework import serializers

from config.limits import DESCRIPTION_MAX, NOTES_MAX

from apps.clients.models import Client

from .models import Package, PackagePlan

PACKAGE_FIELDS = [
    "id",
    "professional",
    "client",
    "plan",
    "service",
    "name",
    "total_sessions",
    "total_value",
    "status",
    "start_date",
    "expiration_date",
    "notes",
    "used_sessions",
    "remaining_sessions",
    "created_at",
    "updated_at",
]


class PackageSerializer(serializers.ModelSerializer):
    used_sessions = serializers.IntegerField(read_only=True)
    remaining_sessions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Package
        fields = PACKAGE_FIELDS
        read_only_fields = fields


class PackageWriteSerializer(serializers.ModelSerializer):
    used_sessions = serializers.IntegerField(read_only=True)
    remaining_sessions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Package
        fields = PACKAGE_FIELDS
        read_only_fields = ["id", "used_sessions", "remaining_sessions", "created_at", "updated_at"]
        extra_kwargs = {"notes": {"max_length": NOTES_MAX}}


class PackageSelfWriteSerializer(PackageWriteSerializer):
    class Meta(PackageWriteSerializer.Meta):
        read_only_fields = PackageWriteSerializer.Meta.read_only_fields + ["professional"]


PLAN_FIELDS = [
    "id", "professional", "service", "name", "description", "total_sessions", "total_value",
    "validity_days", "created_at", "updated_at",
]


class PackagePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePlan
        fields = PLAN_FIELDS
        read_only_fields = fields


class PackagePlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePlan
        fields = PLAN_FIELDS
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"description": {"max_length": DESCRIPTION_MAX}}

    def validate(self, attrs):
        if "total_sessions" in attrs and attrs["total_sessions"] < 1:
            raise serializers.ValidationError({"total_sessions": "Deve ser pelo menos 1."})
        if "total_value" in attrs and attrs["total_value"] < 0:
            raise serializers.ValidationError({"total_value": "Não pode ser negativo."})
        return attrs


class PackagePlanSelfWriteSerializer(PackagePlanWriteSerializer):
    class Meta(PackagePlanWriteSerializer.Meta):
        read_only_fields = PackagePlanWriteSerializer.Meta.read_only_fields + ["professional"]


class AssignPlanSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all())
    plan = serializers.PrimaryKeyRelatedField(queryset=PackagePlan.objects.all())
    start_date = serializers.DateField(required=False)
