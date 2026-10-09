from rest_framework.test import APITestCase, APIClient
from apps.accounts.models import CustomUser

class NameFeatureTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email="teacher@test.com",
            password="password",
            role="admin",
            is_email_verified=True
        )

    def test_update_name(self):
        self.client.force_authenticate(user=self.user)
        # Test GET
        res1 = self.client.get("/api/auth/me/")
        print(res1.data)
        self.assertEqual(res1.data.get("full_name"), None)
        
        # Test PATCH
        res2 = self.client.patch("/api/auth/me/", {"full_name": "Jane Doe"}, content_type="application/json")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data["full_name"], "Jane Doe")
        
        # Verify in DB
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Jane Doe")

    def test_course_report_contains_full_name(self):
        from apps.institutions.models import Institution
        from apps.courses.models import Course
        from apps.attendance.models import Enrollment
        
        from apps.institutions.models import Department
        
        inst = Institution.objects.create(name="Test Inst")
        dept = Department.objects.create(name="CS", institution=inst)
        self.user.institution = inst
        self.user.save()
        
        # Create a course
        course = Course.objects.create(name="CS101", institution=inst, department=dept)
        
        # Create a student with a name
        student = CustomUser.objects.create_user(
            email="student@test.com",
            password="password",
            role="student",
            full_name="Bob Builder",
            is_email_verified=True,
            institution=inst
        )
        
        # Enroll the student
        Enrollment.objects.create(course=course, student=student)
        
        # Add teacher to course
        from apps.courses.models import CourseInstructor
        CourseInstructor.objects.create(course=course, instructor=self.user)
        
        # Fetch the report as a teacher
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f"/api/reports/courses/{course.id}/")
        print("Course ID:", course.id)
        print(res.data)
        self.assertEqual(res.status_code, 200)
        
        # Assert full_name is present in the students report
        students_report = res.data["students"]
        self.assertEqual(len(students_report), 1)
        self.assertEqual(students_report[0]["full_name"], "Bob Builder")
