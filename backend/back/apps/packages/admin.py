from django.contrib import admin

from .models import Package, PackagePlan


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "client", "professional", "status", "total_sessions", "start_date"]
    list_filter = ["status"]


@admin.register(PackagePlan)
class PackagePlanAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "professional", "total_sessions", "total_value"]
