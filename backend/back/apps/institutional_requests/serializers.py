from rest_framework import serializers

from config.limits import MESSAGE_MAX

from apps.professionals.models import Professional

from .models import InstitutionalRequest


class InstitutionalRequestPublicCreateSerializer(serializers.ModelSerializer):
    """Entrada publica, sem autenticacao - so os campos que um visitante
    preenche. status/forwarded_* sao sempre decididos pelo servidor."""

    class Meta:
        model = InstitutionalRequest
        fields = ["kind", "name", "email", "phone", "message"]
        extra_kwargs = {"message": {"max_length": MESSAGE_MAX}}


class InstitutionalRequestSerializer(serializers.ModelSerializer):
    """Leitura pela equipe (ADMIN) - fila e detalhe."""

    class Meta:
        model = InstitutionalRequest
        fields = [
            "id", "kind", "name", "email", "phone", "message", "status",
            "forwarded_to", "forwarded_lead", "forwarded_at", "created_at", "updated_at",
        ]
        read_only_fields = fields


class InstitutionalRequestStatusSerializer(serializers.ModelSerializer):
    # ModelSerializer deixaria isso required=False sozinho: o model tem
    # default=NEW, e o DRF trata "tem default" como "opcional" na
    # auto-geracao do campo. Aqui e o unico campo do serializer - omitir
    # `status` do corpo tem que dar 400, nao passar como "nada mudou".
    status = serializers.ChoiceField(choices=InstitutionalRequest.STATUS_CHOICES, required=True)

    class Meta:
        model = InstitutionalRequest
        fields = ["status"]

    def validate_status(self, value):
        if value == InstitutionalRequest.FORWARDED:
            raise serializers.ValidationError("Use a ação de encaminhar, não PATCH direto de status.")
        return value


class InstitutionalRequestForwardSerializer(serializers.Serializer):
    # So terapeuta ativo e publico pode receber encaminhamento.
    professional = serializers.PrimaryKeyRelatedField(
        queryset=Professional.objects.filter(is_public=True, user__active=True)
    )
