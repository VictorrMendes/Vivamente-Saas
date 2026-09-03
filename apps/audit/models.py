from django.db import models

from apps.auth.models import OauthUser


class OauthAuditLog(models.Model):
    user = models.ForeignKey(
        OauthUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    event = models.CharField(max_length=50)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "oauth_audit_log"
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.event} @ {self.created_at}"
