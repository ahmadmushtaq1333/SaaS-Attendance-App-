from django.contrib import admin
from .models import AttendanceSession, QRToken, AttendanceRecord

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "start_time", "expiry_time")
    list_filter = ("course__institution", "course")

@admin.register(QRToken)
class QRTokenAdmin(admin.ModelAdmin):
    list_display = ("token_uuid", "session", "expiry_time")

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("student", "session", "timestamp", "sync_status")
    list_filter = ("sync_status", "session__course")
    search_fields = ("student__email",)
