from django.db import models

from apps.auth.models import OauthUser


class OauthSession(models.Model):
    user = models.ForeignKey(
        OauthUser, on_delete=models.CASCADE, related_name="sessions"
    )
    user_agent = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "oauth_sessions"
        indexes = [models.Index(fields=["user"])]

    def __str__(self):
        return f"session {self.id} ({self.user.email})"
