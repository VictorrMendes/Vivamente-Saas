from django.contrib import admin

from .models import InstitutionalRequest


@admin.register(InstitutionalRequest)
class InstitutionalRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "kind", "status", "forwarded_to", "created_at"]
    list_filter = ["kind", "status"]
