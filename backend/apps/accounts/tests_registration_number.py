from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.institutions.models import Institution, Department, Semester, Section
from apps.accounts.registration_number import derive_registration_number
from apps.accounts.serializers_admin import UserAdminSerializer

User = get_user_model()


class RegistrationNumberAutoDerivationTest(APITestCase):
    """
    Tests for the auto-derived registration number feature.
    Verifies that:
      1. derive_registration_number utility extracts and uppercases cleanly.
      2. UserAdminSerializer.create() auto-assigns registration_number for students.
      3. UserAdminSerializer.create() preserves manually specified registration_number.
      4. UserAdminSerializer.validate() rejects duplicates if derived reg_no is already taken.
      5. UserAdminSerializer.update() re-derives reg_no when email changes ONLY if it was auto-derived.
      6. CustomUser.save() auto-assigns registration_number if left empty for students.
      7. Teachers and admins are never auto-assigned a student registration number.
    """

    def setUp(self):
        self.institution = Institution.objects.create(name="Apex University", slug="apex")
        self.department = Department.objects.create(name="Software Engineering", institution=self.institution)
        self.semester = Semester.objects.create(number=4, department=self.department)
        self.section = Section.objects.create(name="A", semester=self.semester)
        self.admin = User.objects.create_superuser(
            email="admin@apex.edu", password="adminpassword", institution=self.institution
        )

    # ── Pure Function Tests ──────────────────────────────────────────────────

    def test_derive_registration_number_standard_email(self):
        self.assertEqual(derive_registration_number("24pwswe0018@apex.edu"), "24PWSWE0018")
        self.assertEqual(derive_registration_number("john.doe@mit.edu"), "JOHN.DOE")
        self.assertEqual(derive_registration_number("STD-109@UNI.EDU"), "STD-109")

    def test_derive_registration_number_whitespace_and_edge_cases(self):
        self.assertEqual(derive_registration_number("  24pwswe0099@apex.edu  "), "24PWSWE0099")
        self.assertIsNone(derive_registration_number(""))
        self.assertIsNone(derive_registration_number(None))
        self.assertIsNone(derive_registration_number("not-an-email"))
        self.assertIsNone(derive_registration_number("@apex.edu"))

    # ── Serializer Creation Tests ────────────────────────────────────────────

    def test_create_student_auto_populates_registration_number(self):
        data = {
            "email": "24pwswe0018@apex.edu",
            "password": "password123",
            "role": "student",
            "section": self.section.id,
            "full_name": "Alice Smith",
        }
        serializer = UserAdminSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.registration_number, "24PWSWE0018")
        # Ensure returned serialized data also contains the derived registration number
        self.assertEqual(serializer.data["registration_number"], "24PWSWE0018")

    def test_create_student_preserves_explicit_registration_number(self):
        data = {
            "email": "24pwswe0018@apex.edu",
            "password": "password123",
            "role": "student",
            "section": self.section.id,
            "registration_number": "CUSTOM-REG-999",
        }
        serializer = UserAdminSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.registration_number, "CUSTOM-REG-999")

    def test_create_student_rejects_duplicate_derived_registration_number(self):
        # Create an initial student with reg_no 24PWSWE0018
        User.objects.create_user(
            email="existing@apex.edu",
            password="password123",
            role="student",
            section=self.section,
            registration_number="24PWSWE0018",
        )

        # Attempt to create another student whose email derives to the same reg_no
        data = {
            "email": "24pwswe0018@apex.edu",
            "password": "password123",
            "role": "student",
            "section": self.section.id,
        }
        serializer = UserAdminSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("registration_number", serializer.errors)

    # ── Serializer Update Tests ──────────────────────────────────────────────

    def test_update_student_email_updates_auto_derived_registration_number(self):
        # Create user with auto-derived reg_no
        data = {
            "email": "24pwswe0001@apex.edu",
            "password": "password123",
            "role": "student",
            "section": self.section.id,
        }
        serializer = UserAdminSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.registration_number, "24PWSWE0001")

        # Update their email to 24pwswe0002@apex.edu without specifying registration_number
        update_serializer = UserAdminSerializer(
            instance=user,
            data={"email": "24pwswe0002@apex.edu"},
            partial=True
        )
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        updated_user = update_serializer.save()

        self.assertEqual(updated_user.registration_number, "24PWSWE0002")

    def test_update_student_email_preserves_custom_registration_number(self):
        # Create user with custom reg_no
        user = User.objects.create_user(
            email="24pwswe0001@apex.edu",
            password="password123",
            role="student",
            section=self.section,
            registration_number="MANUAL-OVERRIDE-42",
        )

        # Update email — custom reg_no must NOT be clobbered
        update_serializer = UserAdminSerializer(
            instance=user,
            data={"email": "new.email@apex.edu"},
            partial=True
        )
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        updated_user = update_serializer.save()

        self.assertEqual(updated_user.registration_number, "MANUAL-OVERRIDE-42")

    # ── Model Level save() Tests ─────────────────────────────────────────────

    def test_model_save_auto_populates_registration_number_for_students(self):
        student = User.objects.create_user(
            email="24pwswe0055@apex.edu",
            password="password123",
            role="student",
            section=self.section,
        )
        self.assertEqual(student.registration_number, "24PWSWE0055")

    def test_model_save_does_not_populate_for_teachers_or_admins(self):
        teacher = User.objects.create_user(
            email="prof.smith@apex.edu",
            password="password123",
            role="teacher",
            institution=self.institution,
        )
        self.assertIsNone(teacher.registration_number)
