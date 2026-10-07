from django.contrib import admin
from .models import Course, Enrollment, CourseInstructor, CourseLink


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


@admin.register(CourseLink)
class CourseLinkAdmin(admin.ModelAdmin):
    list_display = ("source_course", "target_course", "link_type", "created_by", "created_at")
    list_filter = ("link_type", "source_course__institution")
    search_fields = ("source_course__name", "target_course__name")
    autocomplete_fields = []  # set to ("source_course", "target_course") if search_fields on Course
    raw_id_fields = ("source_course", "target_course", "created_by")
