from rest_framework import serializers
from apps.institutions.models import Institution, Department, Semester, Section

class InstitutionAdminSerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True, default=0)
    course_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Institution
        fields = ("id", "name", "slug", "domain", "created_at", "user_count", "course_count")
        read_only_fields = ("id", "created_at")

class DepartmentAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name", "institution", "created_at")
        read_only_fields = ("id", "created_at")

class SemesterAdminSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Semester
        fields = ("id", "number", "department", "department_name", "created_at")
        read_only_fields = ("id", "created_at")

class SectionAdminSerializer(serializers.ModelSerializer):
    semester_number = serializers.CharField(source="semester.number", read_only=True)
    department_name = serializers.CharField(source="semester.department.name", read_only=True)

    class Meta:
        model = Section
        fields = ("id", "name", "semester", "semester_number", "department_name", "created_at")
        read_only_fields = ("id", "created_at")
