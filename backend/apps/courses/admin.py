from django.contrib import admin
from .models import Course, Enrollment

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("name", "institution", "teacher", "created_at")
    list_filter = ("institution", "teacher")
    search_fields = ("name",)

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "enrolled_at")
    list_filter = ("course__institution", "course")
    search_fields = ("student__email", "course__name")
