from django.contrib import admin
from .models import Institution

@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")
