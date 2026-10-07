import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_saas.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.courses.models import Course, CourseInstructor, Enrollment, CourseLink
from apps.institutions.models import Institution, Department
from apps.attendance.models import AttendanceSession, AttendanceRecord
from apps.attendance.services.replication_service import AttendanceReplicationService

User = get_user_model()

def run_test():
    print("--- Starting Replication Test ---")
    
    # 1. Setup minimal data
    institution, _ = Institution.objects.get_or_create(name="Test Univ")
    department, _ = Department.objects.get_or_create(name="CS", institution=institution)

    # 1.a Teacher
    teacher, _ = User.objects.get_or_create(email="teacher_repl_test@test.com", defaults={"role": "teacher"})
    
    # 1.b Students
    student1, _ = User.objects.get_or_create(email="s1_repl@test.com", defaults={"role": "student"})
    student2, _ = User.objects.get_or_create(email="s2_repl@test.com", defaults={"role": "student"})

    # 1.c Courses
    theory, _ = Course.objects.get_or_create(name="CS101 Theory", institution=institution, department=department)
    lab, _ = Course.objects.get_or_create(name="CS101 Lab", institution=institution, department=department)

    # Assign teacher
    CourseInstructor.objects.get_or_create(course=theory, instructor=teacher)
    CourseInstructor.objects.get_or_create(course=lab, instructor=teacher)

    # Enroll students
    Enrollment.objects.get_or_create(course=theory, student=student1)
    Enrollment.objects.get_or_create(course=theory, student=student2)
    # student2 is NOT enrolled in lab intentionally to test the 'skip not enrolled' feature.
    Enrollment.objects.get_or_create(course=lab, student=student1)

    # 1.d CourseLink
    link, _ = CourseLink.objects.get_or_create(source_course=theory, target_course=lab)
    print(f"Created CourseLink: {link}")

    # 2. Create Source Session
    now = timezone.now()
    source_session = AttendanceSession.objects.create(
        course=theory,
        start_time=now,
        expiry_time=now + timedelta(hours=1)
    )
    print(f"Created Source Session: ID {source_session.id} for {theory.name}")

    # Mark student1 and student2 present in Theory
    enr_s1_theory = Enrollment.objects.get(course=theory, student=student1)
    enr_s2_theory = Enrollment.objects.get(course=theory, student=student2)

    AttendanceRecord.objects.create(session=source_session, enrollment=enr_s1_theory, timestamp=now)
    AttendanceRecord.objects.create(session=source_session, enrollment=enr_s2_theory, timestamp=now)
    print("Marked 2 students (s1 and s2) present in Theory session.")

    # 3. Perform Replication
    print("\n--- Executing Replication Service ---")
    try:
        result = AttendanceReplicationService.replicate(
            source_session_id=source_session.id,
            target_course_id=lab.id,
            requesting_teacher=teacher,
            conflict_strategy="replace"
        )
        print("Result:", result)
    except Exception as e:
        print("Replication failed:", str(e))
        return

    # 4. Verify Database State
    target_session_id = result.get("target_session_id")
    target_session = AttendanceSession.objects.get(id=target_session_id)

    # Check assertions
    print("\n--- Validating Rules & Edge Cases ---")
    
    is_replicated = target_session.is_replicated
    print(f"Target session is_replicated = {is_replicated} (Expected: True)")
    
    replicated_from_id = target_session.replicated_from_id
    print(f"Target session replicated_from = {replicated_from_id} (Expected: {source_session.id})")
    
    cloned_records = AttendanceRecord.objects.filter(session=target_session)
    print(f"Target session cloned records count: {cloned_records.count()} (Expected: 1, because s2 is not enrolled in Lab)")
    
    if is_replicated and replicated_from_id == source_session.id and cloned_records.count() == 1:
        print("\nALL TESTS PASSED SUCCESSFULLY! The feature works end-to-end.")
    else:
        print("\nTEST FAILED!")

if __name__ == '__main__':
    run_test()
