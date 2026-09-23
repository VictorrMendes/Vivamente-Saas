from rest_framework import serializers

from .models import Appointment, AvailabilitySlot


def _validate_period(attrs, instance):
    starts_at = attrs.get("starts_at", getattr(instance, "starts_at", None))
    ends_at = attrs.get("ends_at", getattr(instance, "ends_at", None))
    if starts_at and ends_at and ends_at <= starts_at:
        raise serializers.ValidationError({"ends_at": "Deve ser depois de starts_at."})


AVAILABILITY_FIELDS = ["id", "professional", "starts_at", "ends_at", "is_blocked"]


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = AVAILABILITY_FIELDS
        read_only_fields = fields


class AvailabilitySlotWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = AVAILABILITY_FIELDS
        read_only_fields = ["id"]

    def validate(self, attrs):
        _validate_period(attrs, self.instance)
        return attrs


class AvailabilitySlotSelfWriteSerializer(AvailabilitySlotWriteSerializer):
    class Meta(AvailabilitySlotWriteSerializer.Meta):
        read_only_fields = AvailabilitySlotWriteSerializer.Meta.read_only_fields + ["professional"]


APPOINTMENT_FIELDS = [
    "id",
    "professional",
    "client",
    "service",
    "package",
    "starts_at",
    "ends_at",
    "status",
    "modality",
    "call_link",
    "price",
    "notes",
    "created_at",
    "started_at", "finished_at", "confirmation_requested_at", "confirmation_source",
]


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = APPOINTMENT_FIELDS
        read_only_fields = fields


RECURRENCE_CHOICES = ["WEEKLY", "BIWEEKLY", "MONTHLY"]
MAX_OCCURRENCES = 52


class AppointmentWriteSerializer(serializers.ModelSerializer):
    # Só na criação: repete a consulta no mesmo dia/horário (a série inteira, contando esta).
    recurrence = serializers.ChoiceField(choices=RECURRENCE_CHOICES, write_only=True, required=False)
    occurrences = serializers.IntegerField(min_value=2, max_value=MAX_OCCURRENCES, write_only=True, required=False)

    class Meta:
        model = Appointment
        fields = APPOINTMENT_FIELDS + ["recurrence", "occurrences"]
        read_only_fields = ["id", "status", "created_at", "started_at", "finished_at",
                            "confirmation_requested_at", "confirmation_source"]

    def validate(self, attrs):
        _validate_period(attrs, self.instance)
        if self.instance is not None and ("recurrence" in attrs or "occurrences" in attrs):
            raise serializers.ValidationError({"recurrence": "A recorrência só vale na criação."})
        if ("recurrence" in attrs) != ("occurrences" in attrs):
            raise serializers.ValidationError({"occurrences": "Informe a recorrência e o número de consultas juntos."})
        return attrs


class AppointmentSelfWriteSerializer(AppointmentWriteSerializer):
    class Meta(AppointmentWriteSerializer.Meta):
        read_only_fields = AppointmentWriteSerializer.Meta.read_only_fields + ["professional"]
