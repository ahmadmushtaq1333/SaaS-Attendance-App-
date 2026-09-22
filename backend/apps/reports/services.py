from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from apps.reports.email_templates import get_tier_for_percentage, get_bulk_tier_email
from apps.attendance.models import AttendanceSession, AttendanceRecord
from apps.courses.models import Enrollment
from shared.attendance_utils import calculate_attendance_percentage

def send_tier_notification(course, tier, target_student_emails):
    """Sends a warning email to a specific list of students."""
    if not target_student_emails:
        return 0

    subject, plain_body, html_body = get_bulk_tier_email(course.name, tier)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@quorum.com"),
        to=[getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@quorum.com")],
        bcc=target_student_emails,
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)
    return len(target_student_emails)

def get_students_in_tier(course, tier):
    """Returns a list of emails of students in the specified attendance tier."""
    sessions = AttendanceSession.objects.filter(course=course)
    total_sessions = sessions.count()
    if total_sessions == 0:
        return []

    enrollments = Enrollment.objects.filter(course=course).select_related("student")
    records = set(AttendanceRecord.objects.filter(session__course=course).values_list("enrollment_id", "session_id"))

    target_student_emails = []
    for enrollment in enrollments:
        student = enrollment.student
        attended_count = sum(1 for session in sessions if (enrollment.id, session.id) in records)
        attendance_percentage = calculate_attendance_percentage(attended_count, total_sessions)
        
        calculated_tier = get_tier_for_percentage(attendance_percentage)
        if calculated_tier == tier:
            target_student_emails.append(student.email)
            
    return target_student_emails

def notify_student_attendance(course, student):
    """Calculates a single student's attendance tier and sends an email if necessary."""
    sessions = AttendanceSession.objects.filter(course=course)
    total_sessions = sessions.count()
    if total_sessions == 0:
        return None

    try:
        enrollment = Enrollment.objects.get(student=student, course=course)
    except Enrollment.DoesNotExist:
        return None

    attended = AttendanceRecord.objects.filter(enrollment=enrollment).count()
    attendance_pct = calculate_attendance_percentage(attended, total_sessions)
    tier = get_tier_for_percentage(attendance_pct)

    if tier:
        subject, plain_body, html_body = get_bulk_tier_email(course.name, tier)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@quorum.com"),
            to=[student.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        
    return tier
