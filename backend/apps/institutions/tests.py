"""
Tests for Issue #1 fix: UnorderedObjectListWarning
Verifies that Institution, Department, Semester, Section all have
deterministic ordering so pagination never yields inconsistent results.
"""
import warnings
from unittest.mock import MagicMock
from rest_framework.test import APITestCase
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from apps.institutions.models import Institution, Department, Semester, Section

User = get_user_model()


def make_mock_request(page=1):
    """Create a minimal mock request that satisfies DRF's paginator."""
    req = MagicMock()
    req.query_params = {"page": str(page)}
    req.build_absolute_uri = lambda url="": url
    return req


class ModelOrderingTest(APITestCase):
    """Verify Meta.ordering is defined on each model."""

    def test_institution_has_ordering(self):
        self.assertTrue(
            Institution._meta.ordering,
            "Institution must define Meta.ordering to prevent UnorderedObjectListWarning"
        )

    def test_department_has_ordering(self):
        self.assertTrue(
            Department._meta.ordering,
            "Department must define Meta.ordering to prevent UnorderedObjectListWarning"
        )

    def test_semester_has_ordering(self):
        self.assertTrue(
            Semester._meta.ordering,
            "Semester must define Meta.ordering to prevent UnorderedObjectListWarning"
        )

    def test_section_has_ordering(self):
        self.assertTrue(
            Section._meta.ordering,
            "Section must define Meta.ordering to prevent UnorderedObjectListWarning"
        )


class PaginationOrderingWarningTest(APITestCase):
    """
    Simulates what DRF's PageNumberPagination does and asserts
    no UnorderedObjectListWarning is raised.
    """

    def setUp(self):
        self.inst_z = Institution.objects.create(name="Zebra University", slug="zebra")
        self.inst_a = Institution.objects.create(name="Alpha College", slug="alpha")
        self.inst_m = Institution.objects.create(name="Metro Institute", slug="metro")

        self.dept = Department.objects.create(name="CS", institution=self.inst_a)
        self.sem = Semester.objects.create(number="Semester 1", department=self.dept)
        self.sec = Section.objects.create(name="Section A", semester=self.sem)

    def _paginate(self, queryset):
        paginator = PageNumberPagination()
        paginator.page_size = 10
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            paginator.paginate_queryset(queryset, request=make_mock_request())
            unordered = [
                w for w in caught
                if issubclass(w.category, UserWarning)
                and "UnorderedObjectListWarning" in str(w.message)
            ]
        return unordered

    def test_institution_pagination_no_warning(self):
        warnings_raised = self._paginate(Institution.objects.all())
        self.assertEqual(
            warnings_raised, [],
            f"Institution pagination raised UnorderedObjectListWarning: {warnings_raised}"
        )

    def test_department_pagination_no_warning(self):
        warnings_raised = self._paginate(Department.objects.all())
        self.assertEqual(warnings_raised, [], "Department pagination raised UnorderedObjectListWarning")

    def test_semester_pagination_no_warning(self):
        warnings_raised = self._paginate(Semester.objects.all())
        self.assertEqual(warnings_raised, [], "Semester pagination raised UnorderedObjectListWarning")

    def test_section_pagination_no_warning(self):
        warnings_raised = self._paginate(Section.objects.all())
        self.assertEqual(warnings_raised, [], "Section pagination raised UnorderedObjectListWarning")

    def test_institutions_are_ordered_by_name(self):
        names = list(Institution.objects.values_list("name", flat=True))
        self.assertEqual(names, sorted(names), f"Institutions not sorted by name: {names}")

    def test_departments_are_ordered_by_name(self):
        Department.objects.create(name="Maths", institution=self.inst_a)
        Department.objects.create(name="Biology", institution=self.inst_a)
        names = list(Department.objects.values_list("name", flat=True))
        self.assertEqual(names, sorted(names), f"Departments not sorted by name: {names}")

    def test_semesters_are_ordered_by_number(self):
        Semester.objects.create(number="Semester 3", department=self.dept)
        Semester.objects.create(number="Semester 2", department=self.dept)
        nums = list(Semester.objects.values_list("number", flat=True))
        self.assertEqual(nums, sorted(nums), f"Semesters not sorted by number: {nums}")

    def test_sections_are_ordered_by_name(self):
        Section.objects.create(name="Section C", semester=self.sem)
        Section.objects.create(name="Section B", semester=self.sem)
        names = list(Section.objects.values_list("name", flat=True))
        self.assertEqual(names, sorted(names), f"Sections not sorted by name: {names}")


class AdminEndpointOrderingTest(APITestCase):
    """
    Hits the real paginated admin endpoints as an admin user and checks:
    - HTTP 200 response
    - Results come back in expected sorted order
    """

    def setUp(self):
        self.institution = Institution.objects.create(name="Test University", slug="test-uni")
        self.admin = User.objects.create_superuser(
            email="admin@test.edu",
            password="adminpass123",
            role="admin",
            institution=self.institution,
        )
        self.client.force_authenticate(user=self.admin)

        # Create institutions out-of-alphabetical order to prove sorting works
        Institution.objects.create(name="Zebra College", slug="zebra-col")
        Institution.objects.create(name="Alpha Academy", slug="alpha-acad")

        self.dept_z = Department.objects.create(name="Zoology", institution=self.institution)
        self.dept_a = Department.objects.create(name="Accounting", institution=self.institution)

        self.sem2 = Semester.objects.create(number="Semester 2", department=self.dept_a)
        self.sem1 = Semester.objects.create(number="Semester 1", department=self.dept_a)

        self.secC = Section.objects.create(name="Section C", semester=self.sem1)
        self.secA = Section.objects.create(name="Section A", semester=self.sem1)

    def test_institutions_endpoint_returns_200(self):
        res = self.client.get("/api/admin/institutions/")
        self.assertEqual(res.status_code, 200)

    def test_institutions_endpoint_sorted_by_name(self):
        res = self.client.get("/api/admin/institutions/")
        names = [r["name"] for r in res.data.get("results", res.data)]
        self.assertEqual(names, sorted(names), f"API returned institutions unsorted: {names}")

    def test_departments_endpoint_returns_200(self):
        res = self.client.get("/api/admin/departments/")
        self.assertEqual(res.status_code, 200)

    def test_departments_endpoint_sorted_by_name(self):
        res = self.client.get("/api/admin/departments/")
        names = [r["name"] for r in res.data.get("results", res.data)]
        self.assertEqual(names, sorted(names), f"API returned departments unsorted: {names}")

    def test_semesters_endpoint_returns_200(self):
        res = self.client.get("/api/admin/semesters/")
        self.assertEqual(res.status_code, 200)

    def test_semesters_endpoint_sorted_by_number(self):
        res = self.client.get("/api/admin/semesters/")
        numbers = [r["number"] for r in res.data.get("results", res.data)]
        self.assertEqual(numbers, sorted(numbers), f"API returned semesters unsorted: {numbers}")

    def test_sections_endpoint_returns_200(self):
        res = self.client.get("/api/admin/sections/")
        self.assertEqual(res.status_code, 200)

    def test_sections_endpoint_sorted_by_name(self):
        res = self.client.get("/api/admin/sections/")
        names = [r["name"] for r in res.data.get("results", res.data)]
        self.assertEqual(names, sorted(names), f"API returned sections unsorted: {names}")
