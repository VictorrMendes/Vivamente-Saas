from rest_framework import serializers


class SessionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    user_agent = serializers.CharField(allow_null=True)
    ip_address = serializers.IPAddressField(allow_null=True)
    created_at = serializers.DateTimeField()
    last_seen_at = serializers.DateTimeField()
    revoked_at = serializers.DateTimeField(allow_null=True)
