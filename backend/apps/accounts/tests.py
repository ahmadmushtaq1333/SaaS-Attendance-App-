from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.test import override_settings
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
        # Obtain JWT (cookie handled automatically)
        response = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("device_token", response.cookies)

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

    def test_device_binding_flow(self):
        from .models import DeviceBinding
        admin = User.objects.create_superuser(
            email="superadmin@mit.edu",
            password="adminpassword",
            role="admin",
            institution=self.institution
        )

        # 1. Initial login sets cookie
        res1 = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())
        device_token = res1.cookies.get("device_token").value

        # 2. Login with different (or missing) cookie fails with device_mismatch
        self.client.cookies.clear()
        res2 = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertTrue(res2.data.get("device_mismatch"))

        # 3. Non-admin (teacher) cannot unbind device
        self.client.force_authenticate(user=self.teacher)
        res3 = self.client.post(f"/api/auth/{self.student.id}/reset-device/")
        self.assertEqual(res3.status_code, 403)

        # 4. Admin successfully unbinds device
        self.client.force_authenticate(user=admin)
        res4 = self.client.post(f"/api/auth/{self.student.id}/reset-device/")
        self.assertEqual(res4.status_code, 200)
        self.assertFalse(DeviceBinding.objects.filter(user=self.student).exists())

        # 5. Now student can bind again on next login
        self.client.force_authenticate(user=None)
        res5 = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(res5.status_code, 200)
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())

    @override_settings(RATELIMIT_ENABLE=False)
    def test_self_service_rebind_flow(self):
        from .models import DeviceBinding, EmailVerificationCode
        
        # 1. Login to bind device
        self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())
        
        # 2. Request Rebind (sends OTP)
        res1 = self.client.post("/api/auth/rebind/request/", {
            "email": "student@mit.edu"
        })
        self.assertEqual(res1.status_code, 200)
        otp_record = EmailVerificationCode.objects.get(user=self.student, purpose="rebind")
        
        # 3. Confirm Rebind
        res2 = self.client.post("/api/auth/rebind/confirm/", {
            "email": "student@mit.edu",
            "code": otp_record.code
        })
        self.assertEqual(res2.status_code, 200)
        self.assertFalse(DeviceBinding.objects.filter(user=self.student).exists())
        
        # 4. Next login is successful and binds again
        res3 = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(res3.status_code, 200)
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())

    def test_daily_device_lock_flow(self):
        student2 = User.objects.create_user(
            email="student2@mit.edu",
            password="password123",
            role="student",
            institution=self.institution,
            is_email_verified=True
        )
        from rest_framework.test import APIClient

        fp_device1 = "fingerprint-device-1"
        fp_device2 = "fingerprint-device-2"

        # Separate clients simulating separate physical browsers/devices
        client_device1 = APIClient()
        client_device2 = APIClient()

        # === Direction 1: Same device (client_device1), different accounts ===

        # Student 1 logs in from device 1
        res1 = client_device1.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123",
            "device_fingerprint": fp_device1
        })
        self.assertEqual(res1.status_code, 200)
        # Persist device_token as a cookie on client_device1 (as the real browser would)
        if res1.cookies.get("device_token"):
            client_device1.cookies["device_token"] = res1.cookies["device_token"].value

        # Student 2 tries same device 1 → BLOCKED (Direction 1)
        res2 = client_device1.post("/api/auth/login/", {
            "email": "student2@mit.edu",
            "password": "password123",
            "device_fingerprint": fp_device1
        })
        self.assertEqual(res2.status_code, 400)
        is_locked = res2.data.get("device_locked")
        if isinstance(is_locked, list): is_locked = is_locked[0]
        self.assertTrue(is_locked)

        # === Direction 2: Same account (student2), different devices ===

        # Student 2 logs in from their own device 2
        res3 = client_device2.post("/api/auth/login/", {
            "email": "student2@mit.edu",
            "password": "password123",
            "device_fingerprint": fp_device2
        })
        self.assertEqual(res3.status_code, 200)
        if res3.cookies.get("device_token"):
            client_device2.cookies["device_token"] = res3.cookies["device_token"].value

        # Student 2 tries to log in from device 1 (proxy) → BLOCKED (Direction 2)
        res4 = client_device1.post("/api/auth/login/", {
            "email": "student2@mit.edu",
            "password": "password123",
            "device_fingerprint": fp_device1
        })
        self.assertEqual(res4.status_code, 400)
        is_locked2 = res4.data.get("device_locked")
        if isinstance(is_locked2, list): is_locked2 = is_locked2[0]
        self.assertTrue(is_locked2)

        # Student 1 logs in again on their own device (client_device1 still has their cookie) → PASSES
        res5 = client_device1.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123",
            "device_fingerprint": fp_device1
        })
        self.assertEqual(res5.status_code, 200)


