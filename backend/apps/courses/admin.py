from django.contrib import admin
from .models import Course, Enrollment, CourseInstructor

@admin.register(CourseInstructor)
class CourseInstructorAdmin(admin.ModelAdmin):
    list_display = ("course", "instructor", "is_primary", "assigned_at")
    list_filter = ("course", "instructor")

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("name", "institution", "department", "section", "created_at")
    list_filter = ("institution", "department", "section")
    search_fields = ("name",)

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "enrolled_at")
    list_filter = ("course__institution", "course")
    search_fields = ("student__email", "course__name")

