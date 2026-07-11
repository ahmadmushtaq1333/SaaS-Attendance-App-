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

from apps.courses.models import Enrollment

class AttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("synced", "Synced"),
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    timestamp = models.DateTimeField()
    sync_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="synced")

    class Meta:
        unique_together = ("enrollment", "session")

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.enrollment.course != self.session.course:
            raise ValidationError("Student enrollment course must match the session course.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.enrollment.student.email} - Session {self.session.id} ({self.sync_status})"

