import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "attendance_saas.settings")
django.setup()

from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession, AttendanceRecord
from django.contrib.auth import get_user_model
User = get_user_model()

print("Students:")
for user in User.objects.filter(role="student"):
    print(f"- {user.email}")
    for enrollment in Enrollment.objects.filter(student=user):
        course = enrollment.course
        sessions = AttendanceSession.objects.filter(course=course).count()
        records = AttendanceRecord.objects.filter(enrollment=enrollment).count()
        print(f"  Enrolled in {course.name}: {records} / {sessions} attended")
