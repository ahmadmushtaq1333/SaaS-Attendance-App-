from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.institutions.models import Institution

User = get_user_model()

class AdminUserNameTest(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="Oxford University", slug="oxford")
        self.admin = User.objects.create_superuser(
            email="admin@oxford.edu",
            password="adminpassword123",
            role="admin",
            institution=self.institution
        )
        self.student = User.objects.create_user(
            email="alice@oxford.edu",
            password="password123",
            role="student",
            full_name="Alice Smith",
            registration_number="OX-2026-001",
            institution=self.institution,
            is_email_verified=True
        )

    def test_admin_user_serializer_includes_full_name(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/admin/users/{self.student.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("full_name", res.data)
        self.assertEqual(res.data["full_name"], "Alice Smith")

    def test_admin_can_patch_student_full_name(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/admin/users/{self.student.id}/",
            {"full_name": "Alice Wonderland"},
            format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["full_name"], "Alice Wonderland")
        
        self.student.refresh_from_db()
        self.assertEqual(self.student.full_name, "Alice Wonderland")

    def test_admin_search_by_full_name(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/admin/users/?search=Alice")
        self.assertEqual(res.status_code, 200)
        users = res.data.get("results", res.data)
        self.assertTrue(any(u["id"] == self.student.id for u in users))

    def test_admin_create_user_with_full_name(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "email": "charlie@oxford.edu",
            "full_name": "Charlie Brown",
            "password": "Password123!",
            "role": "student",
            "institution": self.institution.id
        }
        res = self.client.post("/api/admin/users/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["full_name"], "Charlie Brown")
        new_user = User.objects.get(email="charlie@oxford.edu")
        self.assertEqual(new_user.full_name, "Charlie Brown")
