from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.institutions.models import Institution

User = get_user_model()

class AccountsTestCase(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="MIT", slug="mit")
        self.teacher = User.objects.create_user(
            email="teacher@mit.edu",
            password="password123",
            role="teacher",
            institution=self.institution
        )
        self.student = User.objects.create_user(
            email="student@mit.edu",
            password="password123",
            role="student",
            institution=self.institution,
            is_email_verified=True
        )

    def test_user_creation_and_roles(self):
        self.assertEqual(self.teacher.role, "teacher")
        self.assertEqual(self.student.role, "student")
        self.assertEqual(self.teacher.institution, self.institution)
        self.assertEqual(self.student.institution, self.institution)
        
    def test_login_jwt(self):
        # Obtain JWT with device_id (required for students)
        response = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123",
            "device_id": "test-device-uuid-1234"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_bulk_student_assignment(self):
        from apps.courses.models import Course, Enrollment
        from apps.institutions.models import Department
        dept = Department.objects.create(name="Computer Science", institution=self.institution)
        admin = User.objects.create_superuser(
            email="admin@mit.edu",
            password="adminpassword",
            role="admin",
            institution=self.institution
        )
        student2 = User.objects.create_user(
            email="student2@mit.edu",
            password="password123",
            role="student",
            institution=self.institution,
            is_email_verified=True
        )
        course = Course.objects.create(name="CS101", institution=self.institution, department=dept)

        self.client.force_authenticate(user=admin)
        url = "/api/admin/enrollments/bulk/"

        # 1. Bulk assign both students
        res = self.client.post(url, {
            "course": course.id,
            "student_ids": [self.student.id, student2.id]
        }, format="json")

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["enrolled_count"], 2)
        self.assertEqual(res.data["already_enrolled_count"], 0)
        self.assertEqual(Enrollment.objects.filter(course=course).count(), 2)

        # 2. Re-assign same students - should handle duplicates gracefully
        res2 = self.client.post(url, {
            "course": course.id,
            "student_ids": [self.student.id, student2.id]
        }, format="json")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data["enrolled_count"], 0)
        self.assertEqual(res2.data["already_enrolled_count"], 2)
        self.assertEqual(Enrollment.objects.filter(course=course).count(), 2)
