from rest_framework import serializers
from apps.institutions.models import Institution, Department, Semester, Section
from apps.courses.models import Course, Enrollment, CourseInstructor
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
    institution_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    semester_number = serializers.SerializerMethodField()
    section_name = serializers.CharField(source="section.name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "role", "institution", "institution_name",
            "department", "department_name", "semester_number",
            "section", "section_name", "is_active", "date_joined", "password"
        )
        read_only_fields = ("id", "date_joined")

    def get_institution_name(self, obj):
        inst = obj.get_institution
        return inst.name if inst else None

    def get_department_name(self, obj):
        dept = obj.get_department
        return dept.name if dept else None

    def get_semester_number(self, obj):
        sem = obj.get_semester
        return sem.number if sem else None

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

    def create(self, validated_data):
        teacher_ids = validated_data.pop("teacher_ids", [])
        course = Course.objects.create(**validated_data)
        for i, t_id in enumerate(teacher_ids):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                teacher = User.objects.get(id=t_id, role="teacher")
                CourseInstructor.objects.create(
                    course=course,
                    instructor=teacher,
                    is_primary=(i == 0)
                )
            except User.DoesNotExist:
                pass
        return course

    def update(self, instance, validated_data):
        teacher_ids = validated_data.pop("teacher_ids", None)
        instance = super().update(instance, validated_data)
        if teacher_ids is not None:
            instance.course_instructors.all().delete()
            for i, t_id in enumerate(teacher_ids):
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    teacher = User.objects.get(id=t_id, role="teacher")
                    CourseInstructor.objects.create(
                        course=instance,
                        instructor=teacher,
                        is_primary=(i == 0)
                    )
                except User.DoesNotExist:
                    pass
        return instance


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
