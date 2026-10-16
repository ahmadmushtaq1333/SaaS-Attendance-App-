from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from django.test import override_settings
from apps.institutions.models import Institution
import uuid

User = get_user_model()

class AccountsTestCase(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="MIT", slug="mit")
        self.teacher = User.objects.create_user(
            email="teacher@mit.edu",
            password="password123",
            role="teacher",
            institution=self.institution,
            is_email_verified=True
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
        """
        Teachers get access/refresh JWT directly on login.
        Students go through the WebAuthn gate: initial login returns
        pre_auth_token + requires_webauthn=True instead of raw tokens.
        """
        # --- Teacher: gets tokens directly (no WebAuthn gate) ---
        teacher_res = self.client.post("/api/auth/login/", {
            "email": "teacher@mit.edu",
            "password": "password123"
        })
        self.assertEqual(teacher_res.status_code, 200)
        self.assertIn("access", teacher_res.data)
        self.assertIn("refresh", teacher_res.data)
        self.assertNotIn("requires_webauthn", teacher_res.data)

        # --- Student: hits WebAuthn gate, gets pre_auth_token ---
        student_res = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(student_res.status_code, 200)
        self.assertTrue(student_res.data.get("requires_webauthn"))
        self.assertIn("pre_auth_token", student_res.data)
        self.assertNotIn("access", student_res.data)
        self.assertNotIn("refresh", student_res.data)

        # --- Case-insensitive email ---
        upper_res = self.client.post("/api/auth/login/", {
            "email": "TEACHER@MIT.EDU",
            "password": "password123"
        })
        self.assertEqual(upper_res.status_code, 200)
        self.assertIn("access", upper_res.data)

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
        """
        Device binding is now created after successful WebAuthn verification,
        not on initial login. This test verifies:
          1. Admin can reset a student's device binding.
          2. Teacher cannot reset a device binding (403).
          3. After reset, no binding record exists.
        """
        from .models import DeviceBinding
        admin = User.objects.create_superuser(
            email="superadmin@mit.edu",
            password="adminpassword",
            role="admin",
            institution=self.institution
        )

        # Simulate a DeviceBinding already existing (as if the student completed WebAuthn)
        DeviceBinding.objects.create(user=self.student)
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())

        # 1. Non-admin (teacher) cannot reset device binding → 403
        self.client.force_authenticate(user=self.teacher)
        res_teacher = self.client.post(f"/api/auth/{self.student.id}/reset-device/")
        self.assertEqual(res_teacher.status_code, 403)

        # Binding still exists after failed teacher attempt
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())

        # 2. Admin successfully resets device binding → 200
        self.client.force_authenticate(user=admin)
        res_admin = self.client.post(f"/api/auth/{self.student.id}/reset-device/")
        self.assertEqual(res_admin.status_code, 200)
        self.assertFalse(DeviceBinding.objects.filter(user=self.student).exists())

        # 3. After reset, student's login returns WebAuthn pre_auth_token (no mismatch)
        self.client.force_authenticate(user=None)
        login_res = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.data.get("requires_webauthn"))

    @override_settings(RATELIMIT_ENABLE=False)
    def test_self_service_rebind_flow(self):
        """
        Student self-service device rebind:
          1. A DeviceBinding exists (simulated post-WebAuthn).
          2. Student requests a rebind OTP.
          3. Student confirms with the OTP → binding is deleted.
        """
        from .models import DeviceBinding, EmailVerificationCode

        # Simulate an existing device binding (as if student completed WebAuthn once)
        DeviceBinding.objects.create(user=self.student)
        self.assertTrue(DeviceBinding.objects.filter(user=self.student).exists())

        # 1. Request rebind OTP
        res1 = self.client.post("/api/auth/rebind/request/", {
            "email": "student@mit.edu"
        })
        self.assertEqual(res1.status_code, 200)
        otp_record = EmailVerificationCode.objects.get(user=self.student, purpose="rebind")

        # 2. Confirm rebind with correct OTP → binding deleted
        res2 = self.client.post("/api/auth/rebind/confirm/", {
            "email": "student@mit.edu",
            "code": otp_record.code
        })
        self.assertEqual(res2.status_code, 200)
        self.assertFalse(DeviceBinding.objects.filter(user=self.student).exists())

        # 3. Student can now log in (no binding → WebAuthn flow, no mismatch)
        login_res = self.client.post("/api/auth/login/", {
            "email": "student@mit.edu",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.data.get("requires_webauthn"))

    def test_daily_device_lock_flow(self):
        """
        DailyDeviceLock enforces one account per device per calendar day.
        This test exercises DailyDeviceLockService directly (the service is
        called by the WebAuthn verify step, not the initial login endpoint).
        """
        from .models import DailyDeviceLock
        from .daily_device_lock import DailyDeviceLockService
        from rest_framework import serializers as drf_serializers
        from django.utils import timezone

        student2 = User.objects.create_user(
            email="student2@mit.edu",
            password="password123",
            role="student",
            institution=self.institution,
            is_email_verified=True
        )

        fp_device1 = "fingerprint-device-1"
        fp_device2 = "fingerprint-device-2"
        today = timezone.now().date()

        # --- Direction 1: Same fingerprint, different account ---

        # Student 1 registers device 1 for today
        DailyDeviceLockService.verify(self.student, fp_device1)
        self.assertTrue(DailyDeviceLock.objects.filter(
            device_fingerprint=fp_device1, date=today).exists())

        # Student 2 tries same device today → ValidationError(device_locked)
        with self.assertRaises(drf_serializers.ValidationError) as ctx:
            DailyDeviceLockService.verify(student2, fp_device1)
        self.assertTrue(ctx.exception.detail.get("device_locked"))

        # Student 1 on same device again → OK (no error)
        DailyDeviceLockService.verify(self.student, fp_device1)

        # --- Direction 2: Same account, different device ---

        # Student 2 logs in from device 2 (first time today)
        DailyDeviceLockService.verify(student2, fp_device2)

        # Student 2 then tries from device 1 → ValidationError(device_locked)
        with self.assertRaises(drf_serializers.ValidationError) as ctx2:
            DailyDeviceLockService.verify(student2, fp_device1)
        self.assertTrue(ctx2.exception.detail.get("device_locked"))

        # Admin reset of daily lock for student2 → DailyDeviceLock deleted for today
        self.client.force_authenticate(user=User.objects.create_superuser(
            email="admin2@mit.edu", password="adminpw", institution=self.institution))
        res = self.client.post(f"/api/auth/{student2.id}/reset-daily-lock/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(DailyDeviceLock.objects.filter(user=student2, date=today).exists())
