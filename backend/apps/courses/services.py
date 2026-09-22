from apps.courses.models import Enrollment, Course
from django.contrib.auth import get_user_model

User = get_user_model()

def enroll_student_in_course(student_id: int, course_id: int) -> Enrollment:
    """Service to handle enrolling a student in a course"""
    student = User.objects.get(id=student_id)
    course = Course.objects.get(id=course_id)
    enrollment, created = Enrollment.objects.get_or_create(
        student=student, 
        course=course
    )
    return enrollment
