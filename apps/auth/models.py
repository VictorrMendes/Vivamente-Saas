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
