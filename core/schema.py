from drf_spectacular.utils import inline_serializer
from rest_framework import serializers


_envelope_cache = {}


def envelope_of(data_serializer, many=False):
    """Serializer de schema pro envelope {"data": ..., "meta": {...}}.

    Memoizado por (data_serializer, many) - inline_serializer cria uma
    classe nova a cada chamada, e o drf-spectacular identifica componentes
    do schema pelo nome da classe. Sem cache, cada view que reaproveita o
    mesmo data_serializer geraria uma classe diferente com o mesmo nome
    ("UserSerializerEnvelope", por exemplo), e o gerador de schema acusa
    "components com nomes identicos e identidades diferentes".
    """
    key = (data_serializer, many)

    if key not in _envelope_cache:
        _envelope_cache[key] = inline_serializer(
            name=f"{data_serializer.__name__}Envelope",
            fields={
                "data": data_serializer(many=many),
                "meta": serializers.DictField(),
            },
        )

    return _envelope_cache[key]


class SentSerializer(serializers.Serializer):
    sent = serializers.BooleanField()


class VerifiedSerializer(serializers.Serializer):
    verified = serializers.BooleanField()


class ResetSerializer(serializers.Serializer):
    reset = serializers.BooleanField()


class LoggedOutSerializer(serializers.Serializer):
    loggedOut = serializers.BooleanField()


class RevokedSerializer(serializers.Serializer):
    revoked = serializers.BooleanField()


class SessionRevokedSerializer(serializers.Serializer):
    revoked = serializers.BooleanField()
    note = serializers.CharField()
