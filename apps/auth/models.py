from django.db import models


class OauthUser(models.Model):
    ROLE_CHOICES = [
        ("ADMIN", "Admin"),
        ("THERAPIST", "Therapist"),
    ]

    firebase_uid = models.CharField(max_length=128, unique=True)
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    active = models.BooleanField(default=True)
    # Contador de eventos de identidade emitidos para o Back (ver
    # back_sync.py) - garante que o Back aplique os eventos em ordem.
    identity_version = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "oauth_users"

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class IdentitySyncOutbox(models.Model):
    """Outbox de eventos de identidade enviados ao Back (ver back_sync.py).
    O evento e persistido aqui ANTES de tentar a chamada HTTP, pra nunca
    perder um evento por causa de uma falha de rede - falhas transitorias
    deixam o registro PENDING pra retry; falhas permanentes (4xx) marcam
    FAILED sem mais tentativas."""

    PUT = "PUT"
    DELETE = "DELETE"
    EVENT_TYPE_CHOICES = [(PUT, "PUT"), (DELETE, "DELETE")]

    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (SENT, "Sent"),
        (FAILED, "Failed"),
    ]

    event_type = models.CharField(max_length=10, choices=EVENT_TYPE_CHOICES)
    firebase_uid = models.CharField(max_length=128)
    payload = models.JSONField()
    version = models.PositiveIntegerField()
    idempotency_key = models.CharField(max_length=64, unique=True)
    attempts = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=PENDING
    )
    last_error = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "identity_sync_outbox"
        ordering = ["firebase_uid", "version"]
        indexes = [
            models.Index(fields=["firebase_uid", "version"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.event_type} {self.firebase_uid} v{self.version} ({self.status})"
