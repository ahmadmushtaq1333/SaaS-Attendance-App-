from rest_framework import serializers
from apps.courses.models import Course, Enrollment, CourseInstructor
from apps.institutions.serializers_admin import (
    InstitutionAdminSerializer,
    DepartmentAdminSerializer,
    SectionAdminSerializer
)

class NestedInstructorSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="instructor.id", read_only=True)
    email = serializers.EmailField(source="instructor.email", read_only=True)
    is_primary = serializers.BooleanField(read_only=True)

class NestedStudentSerializer(serializers.ModelSerializer):
    enrollment_id = serializers.IntegerField(source="id", read_only=True)
    student_id = serializers.IntegerField(source="student.id", read_only=True)
    email = serializers.EmailField(source="student.email", read_only=True)

    class Meta:
        model = Enrollment
        fields = ("enrollment_id", "student_id", "email")

class CourseAdminReadSerializer(serializers.ModelSerializer):
    institution = InstitutionAdminSerializer(read_only=True)
    department = DepartmentAdminSerializer(read_only=True)
    section = SectionAdminSerializer(read_only=True)
    instructors = NestedInstructorSerializer(source="course_instructors", many=True, read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True, default=0)
    enrolled_students = NestedStudentSerializer(source="enrollments", many=True, read_only=True)

    class Meta:
        model = Course
        fields = (
            "id", "name", "institution", "department",
            "section", "instructors", "enrollment_count", "enrolled_students", "created_at"
        )
        read_only_fields = ("id", "created_at")


class CourseAdminWriteSerializer(serializers.ModelSerializer):
    teacher_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Course
        fields = (
            "id", "name", "institution", "department",
            "section", "teacher_ids"
        )

    def _sync_instructors(self, course, teacher_ids):
        """Single helper used by both create() and update()."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for i, t_id in enumerate(teacher_ids):
            try:
                teacher = User.objects.get(id=t_id, role="teacher")
                CourseInstructor.objects.create(
                    course=course,
                    instructor=teacher,
                    is_primary=(i == 0)
                )
            except User.DoesNotExist:
                pass

    def create(self, validated_data):
        teacher_ids = validated_data.pop("teacher_ids", [])
        course = Course.objects.create(**validated_data)
        self._sync_instructors(course, teacher_ids)
        return course

    def update(self, instance, validated_data):
        teacher_ids = validated_data.pop("teacher_ids", None)
        instance = super().update(instance, validated_data)
        if teacher_ids is not None:
            instance.course_instructors.all().delete()
            self._sync_instructors(instance, teacher_ids)
        return instance


class EnrollmentAdminSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source="student.email", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id", "student", "student_email", "course", "course_name", "enrolled_at")
        read_only_fields = ("id", "student_email", "course_name", "enrolled_at")
