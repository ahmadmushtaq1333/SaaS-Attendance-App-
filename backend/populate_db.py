import os
import sys
import django

# Set settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "attendance_saas.settings.prod")
django.setup()

from django.contrib.auth import get_user_model
from apps.institutions.models import Institution
from apps.courses.models import Course, Enrollment

User = get_user_model()

def populate():
    # 1. Create Institution
    inst, _ = Institution.objects.get_or_create(name="MIT", slug="mit")

    # 2. Create Teacher
    teacher, created = User.objects.get_or_create(
        email="teacher@mit.edu",
        defaults={
            "role": "teacher",
            "institution": inst,
            "is_active": True
        }
    )
    if created:
        teacher.set_password("password123")
        teacher.save()
        print("Teacher created!")
    else:
        print("Teacher already exists.")

    # 3. Create Student
    student, created = User.objects.get_or_create(
        email="student@mit.edu",
        defaults={
            "role": "student",
            "institution": inst,
            "is_active": True
        }
    )
    if created:
        student.set_password("password123")
        student.save()
        print("Student created!")
    else:
        print("Student already exists.")

    # 4. Create Course
    course, created = Course.objects.get_or_create(
        name="Advanced Web Engineering",
        institution=inst,
        teacher=teacher
    )
    if created:
        print("Course created!")

    # 5. Enroll Student
    enrollment, created = Enrollment.objects.get_or_create(
        student=student,
        course=course
    )
    if created:
        print("Student enrolled in course!")

if __name__ == "__main__":
    populate()
