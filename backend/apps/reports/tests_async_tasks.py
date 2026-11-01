from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.institutions.models import Institution, Department
from apps.courses.models import Course, Enrollment, CourseInstructor
from apps.attendance.models import AttendanceSession, AttendanceRecord
from apps.reports.tasks import send_tier_notification_async, notify_student_attendance_async
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class AsyncTasksTestCase(TestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="MIT", slug="mit")
        self.dept = Department.objects.create(name="CS", institution=self.institution)
        self.teacher = User.objects.create_user(
            email="prof_tasks@mit.edu", password="password123", role="teacher", institution=self.institution
        )
        self.student = User.objects.create_user(
            email="student_tasks@mit.edu", password="password123", role="student", institution=self.institution
        )
        self.course = Course.objects.create(name="Distributed Systems", institution=self.institution, department=self.dept)
        CourseInstructor.objects.create(course=self.course, instructor=self.teacher, is_primary=True)
        self.enrollment = Enrollment.objects.create(student=self.student, course=self.course)

        # Create session where student was absent (0% attendance -> CRITICAL tier)
        self.session = AttendanceSession.objects.create(
            course=self.course,
            expiry_time=timezone.now() + timedelta(minutes=60)
        )

        self.client = APIClient()

    def test_send_tier_notification_async_task(self):
        # Execute Celery task directly
        result = send_tier_notification_async.apply(
            args=[self.course.id, "CRITICAL", [self.student.email]]
        ).get()

        self.assertTrue(result["success"])
        self.assertEqual(result["course_id"], self.course.id)
        self.assertEqual(result["sent_count"], 1)

    def test_notify_student_attendance_async_task(self):
        # Execute single student notification task directly
        result = notify_student_attendance_async.apply(
            args=[self.course.id, self.student.id]
        ).get()

        self.assertTrue(result["success"])
        self.assertEqual(result["student_id"], self.student.id)
        self.assertEqual(result["tier"], "CRITICAL")

    def test_bulk_notify_tier_api_queues_task(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post("/api/reports/notify-tier/", {
            "course_id": self.course.id,
            "tier": "CRITICAL"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("task_id", response.data)
        self.assertIn("notified", response.data)

        # Query task status endpoint
        task_id = response.data["task_id"]
        status_res = self.client.get(f"/api/reports/task-status/{task_id}/")
        self.assertEqual(status_res.status_code, 200)
        self.assertIn("status", status_res.data)
