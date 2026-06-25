from rest_framework import serializers
from apps.institutions.models import Institution
from apps.courses.models import Course, Enrollment
from django.contrib.auth import get_user_model

User = get_user_model()

class InstitutionAdminSerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True, default=0)
    course_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Institution
        fields = ("id", "name", "slug", "created_at", "user_count", "course_count")
        read_only_fields = ("id", "created_at")

class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ("id", "email", "role", "institution", "is_active", "date_joined", "password")
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
