from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from apps.institutions.models import Institution
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession, AttendanceRecord

User = get_user_model()

class ReportsTestCase(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="MIT", slug="mit")
        self.teacher = User.objects.create_user(
            email="teacher@mit.edu", password="password123", role="teacher", institution=self.institution
        )
        self.student1 = User.objects.create_user(
            email="student1@mit.edu", password="password123", role="student", institution=self.institution
        )
        self.student2 = User.objects.create_user(
            email="student2@mit.edu", password="password123", role="student", institution=self.institution
        )
        self.course = Course.objects.create(name="Web Dev", institution=self.institution, teacher=self.teacher)
        Enrollment.objects.create(student=self.student1, course=self.course)
        Enrollment.objects.create(student=self.student2, course=self.course)

    def test_reports_defaulter_calculation(self):
        now = timezone.now()
        
        # 4 sessions total
        session1 = AttendanceSession.objects.create(course=self.course, expiry_time=now + timedelta(seconds=120))
        session2 = AttendanceSession.objects.create(course=self.course, expiry_time=now + timedelta(seconds=120))
        session3 = AttendanceSession.objects.create(course=self.course, expiry_time=now + timedelta(seconds=120))
        session4 = AttendanceSession.objects.create(course=self.course, expiry_time=now + timedelta(seconds=120))
        
        # student 1 attends 4/4 (100% -> Good)
        for s in [session1, session2, session3, session4]:
            AttendanceRecord.objects.create(student=self.student1, session=s, timestamp=now)
            
        # student 2 attends 2/4 (50% -> Defaulter < 75%)
        for s in [session1, session2]:
            AttendanceRecord.objects.create(student=self.student2, session=s, timestamp=now)
            
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(f"/api/reports/course/{self.course.id}/")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_sessions"], 4)
        
        # Verify student percentages
        student_records = {s["email"]: s for s in response.data["students"]}
        self.assertEqual(student_records["student1@mit.edu"]["attendance_percentage"], 100.0)
        self.assertEqual(student_records["student2@mit.edu"]["attendance_percentage"], 50.0)
        
        # Verify student 2 is listed as defaulter
        defaulters = [s["email"] for s in response.data["defaulters_list"]]
        self.assertIn("student2@mit.edu", defaulters)
        self.assertNotIn("student1@mit.edu", defaulters)
