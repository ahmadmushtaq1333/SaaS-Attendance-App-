"""
Celery Background Tasks for Attendance Reports and Notifications.

Decouples long-running operations (email dispatch, heavy aggregations)
from the HTTP request/response loop.
"""
import logging
from celery import shared_task
from apps.courses.models import Course
from django.contrib.auth import get_user_model
from .services import send_tier_notification, notify_student_attendance

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_tier_notification_async(self, course_id: int, tier: str, target_student_emails: list):
    """
    Asynchronously sends bulk attendance warning notices in the background.
    """
    try:
        course = Course.objects.get(id=course_id)
        count = send_tier_notification(course, tier, target_student_emails)
        logger.info(
            "Async email task completed: %d notifications sent for %s (%s tier)",
            count, course.name, tier
        )
        return {
            "success": True,
            "course_id": course_id,
            "tier": tier,
            "sent_count": count,
            "recipients": target_student_emails,
        }
    except Exception as exc:
        logger.error("Async email dispatch failed for course %s: %s", course_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_student_attendance_async(self, course_id: int, student_id: int):
    """
    Asynchronously calculates attendance tier and dispatches a warning notice to a single student.
    """
    User = get_user_model()
    try:
        course = Course.objects.get(id=course_id)
        student = User.objects.get(id=student_id, role="student")
        tier = notify_student_attendance(course, student)
        logger.info(
            "Async single student email task completed for %s in %s (tier: %s)",
            student.email, course.name, tier
        )
        return {
            "success": True,
            "course_id": course_id,
            "student_id": student_id,
            "tier": tier,
        }
    except Exception as exc:
        logger.error("Async single student email dispatch failed for student %s: %s", student_id, exc)
        raise self.retry(exc=exc)
