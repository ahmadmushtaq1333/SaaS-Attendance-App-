import uuid
from django.db import models
from django.conf import settings
from apps.courses.models import Course

class AttendanceSession(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sessions")
    start_time = models.DateTimeField(auto_now_add=True)
    expiry_time = models.DateTimeField()

    def __str__(self):
        return f"Session for {self.course.name} ({self.id})"

class QRToken(models.Model):
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="qr_tokens")
    token_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expiry_time = models.DateTimeField()

    def __str__(self):
        return f"Token {self.token_uuid} for Session {self.session.id}"

class AttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("synced", "Synced"),
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "student"},
        related_name="attendance_records"
    )
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    timestamp = models.DateTimeField()
    sync_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="synced")

    class Meta:
        unique_together = ("student", "session")

    def __str__(self):
        return f"{self.student.email} - Session {self.session.id} ({self.sync_status})"
