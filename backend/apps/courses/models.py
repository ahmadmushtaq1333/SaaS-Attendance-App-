from django.db import models
from apps.institutions.models import Institution, Department, Section
from django.conf import settings

class Course(models.Model):
    name = models.CharField(max_length=255)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="courses")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="courses")
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses")
    # Consistent many‑to‑many relationship for instructors
    instructors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='CourseInstructor',
        related_name='courses_taught',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("name", "department", "section")

    def __str__(self):
        return f"{self.name} - {self.institution.name}"

class CourseInstructor(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="course_instructors")
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "teacher"},
        related_name="course_assignments"
    )
    is_primary = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("course", "instructor")

    def __str__(self):
        return f"{self.instructor.email} teaching {self.course.name}"


class Enrollment(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "student"},
        related_name="enrollments"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.email} in {self.course.name}"


class CourseLink(models.Model):
    """
    Admin-configured pairing between two courses (e.g. Theory ↔ Lab).
    The replication feature uses this as the single source of truth.
    Only one entry is needed per pair — the service checks both directions.
    """
    LINK_TYPES = [
        ("theory_lab", "Theory & Lab"),
        ("parallel",   "Parallel Sections"),
        ("other",      "Other"),
    ]
    source_course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="links_as_source"
    )
    target_course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="links_as_target"
    )
    link_type = models.CharField(max_length=20, choices=LINK_TYPES, default="theory_lab")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="course_links_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("source_course", "target_course")
        verbose_name = "Course Link"
        verbose_name_plural = "Course Links"

    def __str__(self):
        return f"{self.source_course.name} <-> {self.target_course.name} ({self.get_link_type_display()})"
