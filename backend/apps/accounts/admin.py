from django.contrib import admin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "institution", "is_active", "is_staff")
    list_filter = ("role", "institution", "is_active")
    search_fields = ("email",)
