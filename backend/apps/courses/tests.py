"""
Tests for Issue #1 fix: Course and CourseLink model ordering.
"""
import warnings
from unittest.mock import MagicMock
from rest_framework.test import APITestCase
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from apps.institutions.models import Institution, Department
from apps.courses.models import Course, CourseLink

User = get_user_model()


def make_mock_request(page=1):
    """Create a minimal mock request that satisfies DRF's paginator."""
    req = MagicMock()
    req.query_params = {"page": str(page)}
    req.build_absolute_uri = lambda url="": url
    return req


class CourseModelOrderingTest(APITestCase):
    """Verify Meta.ordering is defined on Course and CourseLink."""

    def test_course_has_ordering(self):
        self.assertTrue(
            Course._meta.ordering,
            "Course must define Meta.ordering to prevent UnorderedObjectListWarning"
        )

    def test_courselink_has_ordering(self):
        self.assertTrue(
            CourseLink._meta.ordering,
            "CourseLink must define Meta.ordering to prevent UnorderedObjectListWarning"
        )


class CoursePaginationWarningTest(APITestCase):
    """Simulates DRF pagination and asserts no warning is raised."""

    def setUp(self):
        self.institution = Institution.objects.create(name="Test Uni", slug="test-uni-c")
        self.dept = Department.objects.create(name="CS", institution=self.institution)
        # Create courses out of alphabetical order to prove sorting works
        self.course_z = Course.objects.create(name="Zoology 101", institution=self.institution, department=self.dept)
        self.course_a = Course.objects.create(name="Algebra 101", institution=self.institution, department=self.dept)
        self.course_m = Course.objects.create(name="Math 101", institution=self.institution, department=self.dept)

        self.link = CourseLink.objects.create(
            source_course=self.course_z,
            target_course=self.course_a,
            link_type="theory_lab"
        )

    def _paginate(self, queryset):
        paginator = PageNumberPagination()
        paginator.page_size = 10
        mock_request = make_mock_request()
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            paginator.paginate_queryset(queryset, request=mock_request)
            unordered = [
                w for w in caught
                if issubclass(w.category, UserWarning)
                and "UnorderedObjectListWarning" in str(w.message)
            ]
        return unordered

    def test_course_pagination_no_warning(self):
        result = self._paginate(Course.objects.all())
        self.assertEqual(result, [], "Course pagination raised UnorderedObjectListWarning")

    def test_courselink_pagination_no_warning(self):
        result = self._paginate(CourseLink.objects.all())
        self.assertEqual(result, [], "CourseLink pagination raised UnorderedObjectListWarning")

    def test_courses_ordered_by_name(self):
        names = list(Course.objects.values_list("name", flat=True))
        self.assertEqual(names, sorted(names), f"Courses not sorted by name: {names}")

    def test_courselinks_have_ordering_defined(self):
        self.assertEqual(
            CourseLink._meta.ordering, ["created_at"],
            f"CourseLink ordering should be by created_at, got: {CourseLink._meta.ordering}"
        )


class CourseAdminEndpointOrderingTest(APITestCase):
    """Hits real paginated admin course endpoint and verifies sorted results."""

    def setUp(self):
        self.institution = Institution.objects.create(name="Admin Uni", slug="admin-uni-c")
        self.dept = Department.objects.create(name="Engineering", institution=self.institution)
        self.admin = User.objects.create_superuser(
            email="admin@adminuni.edu",
            password="adminpass",
            role="admin",
            institution=self.institution,
        )
        self.client.force_authenticate(user=self.admin)
        # Intentionally out of alphabetical order
        Course.objects.create(name="Physics", institution=self.institution, department=self.dept)
        Course.objects.create(name="Chemistry", institution=self.institution, department=self.dept)
        Course.objects.create(name="Biology", institution=self.institution, department=self.dept)

    def test_courses_endpoint_returns_200(self):
        res = self.client.get("/api/admin/courses/")
        self.assertEqual(res.status_code, 200)

    def test_courses_endpoint_sorted_by_name(self):
        res = self.client.get("/api/admin/courses/")
        names = [r["name"] for r in res.data.get("results", res.data)]
        self.assertEqual(names, sorted(names), f"Courses returned unsorted from API: {names}")
