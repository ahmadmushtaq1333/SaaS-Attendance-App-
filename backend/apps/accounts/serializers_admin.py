from rest_framework import serializers
from apps.institutions.models import Institution, Department, Semester, Section
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession
from django.contrib.auth import get_user_model

User = get_user_model()

class InstitutionAdminSerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True, default=0)
    course_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Institution
        fields = ("id", "name", "slug", "created_at", "user_count", "course_count")
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

class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    institution_name = serializers.CharField(source="institution.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    semester_number = serializers.CharField(source="semester.number", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "role", "institution", "institution_name", "department", "department_name", "semester", "semester_number", "section", "section_name", "is_active", "date_joined", "password")
        read_only_fields = ("id", "date_joined")

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password("password123")
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CourseAdminSerializer(serializers.ModelSerializer):
    teacher_email = serializers.EmailField(source="teacher.email", read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = ("id", "name", "institution", "teacher", "teacher_email", "enrollment_count", "created_at")
        read_only_fields = ("id", "teacher_email", "created_at")

class EnrollmentAdminSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source="student.email", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id", "student", "student_email", "course", "course_name", "enrolled_at")
        read_only_fields = ("id", "student_email", "course_name", "enrolled_at")

class SessionAdminSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = ("id", "course", "course_name", "start_time", "expiry_time")
        read_only_fields = ("id", "course_name", "start_time")
