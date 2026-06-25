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
            institution=self.institution
        )

    def test_user_creation_and_roles(self):
        self.assertEqual(self.teacher.role, "teacher")
        self.assertEqual(self.student.role, "student")
        self.assertEqual(self.teacher.institution, self.institution)
        self.assertEqual(self.student.institution, self.institution)
        
    def test_login_jwt(self):
        # Obtain JWT
        response = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
