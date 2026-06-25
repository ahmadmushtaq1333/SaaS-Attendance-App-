from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid

from apps.institutions.models import Institution
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession, QRToken, AttendanceRecord

User = get_user_model()

class AttendanceTestCase(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="MIT", slug="mit")
        self.teacher = User.objects.create_user(
            email="teacher@mit.edu", password="password123", role="teacher", institution=self.institution
        )
        self.student = User.objects.create_user(
            email="student@mit.edu", password="password123", role="student", institution=self.institution
        )
        self.student_unenrolled = User.objects.create_user(
            email="stranger@mit.edu", password="password123", role="student", institution=self.institution
        )
        self.course = Course.objects.create(name="Web Dev", institution=self.institution, teacher=self.teacher)
        Enrollment.objects.create(student=self.student, course=self.course)

    def test_session_creation(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post("/api/sessions/", {"course_id": self.course.id})
        self.assertEqual(response.status_code, 201)
        self.assertIn("qr_code", response.data)
        
    def test_attendance_marking_validations(self):
        now = timezone.now()
        session = AttendanceSession.objects.create(course=self.course, expiry_time=now + timedelta(seconds=120))
        token = QRToken.objects.create(session=session, expiry_time=now + timedelta(seconds=120))
        
        # Test unenrolled student
        self.client.force_authenticate(user=self.student_unenrolled)
        response = self.client.post("/api/attendance/mark/", {"token_uuid": str(token.token_uuid)})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Student not enrolled")

        # Test enrolled student (success)
        self.client.force_authenticate(user=self.student)
        response = self.client.post("/api/attendance/mark/", {"token_uuid": str(token.token_uuid)})
        self.assertEqual(response.status_code, 201)
        
        # Test duplicate marking
        response = self.client.post("/api/attendance/mark/", {"token_uuid": str(token.token_uuid)})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Attendance already recorded")
        
        # Test expired QR token
        expired_session = AttendanceSession.objects.create(course=self.course, expiry_time=now - timedelta(seconds=1))
        expired_token = QRToken.objects.create(session=expired_session, expiry_time=now - timedelta(seconds=1))
        response = self.client.post("/api/attendance/mark/", {"token_uuid": str(expired_token.token_uuid)})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "QR code expired")
