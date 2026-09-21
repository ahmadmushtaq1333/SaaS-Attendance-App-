from django.contrib import admin
from .models import CustomUser, DeviceBinding, DailyDeviceLock

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "institution", "is_active", "is_staff")
    list_filter = ("role", "institution", "is_active")
    search_fields = ("email",)

@admin.register(DeviceBinding)
class DeviceBindingAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "last_seen")
    search_fields = ("user__email",)

@admin.register(DailyDeviceLock)
class DailyDeviceLockAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "device_fingerprint")
    list_filter = ("date",)
    search_fields = ("user__email", "device_fingerprint")
