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

class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    institution_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    semester_number = serializers.SerializerMethodField()
    section_name = serializers.CharField(source="section.name", read_only=True)
    
    # Computed ID fields for clean frontend cascade population
    computed_institution = serializers.SerializerMethodField()
    computed_department = serializers.SerializerMethodField()
    computed_semester = serializers.SerializerMethodField()
    assigned_courses = serializers.SerializerMethodField()
    enrolled_courses_count = serializers.SerializerMethodField()
    has_bound_device = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "role", "institution", "institution_name",
            "department", "department_name", "semester_number",
            "section", "section_name", "is_active", "date_joined", "password",
            "registration_number", "is_email_verified", "bound_device_id",
            "has_bound_device", "assigned_courses", "enrolled_courses_count",
            "computed_institution", "computed_department", "computed_semester"
        )
        read_only_fields = ("id", "date_joined", "has_bound_device", "assigned_courses", "enrolled_courses_count")

    def get_computed_institution(self, obj):
        inst = obj.get_institution
        return inst.id if inst else None

    def get_computed_department(self, obj):
        dept = obj.get_department
        return dept.id if dept else None

    def get_computed_semester(self, obj):
        sem = obj.get_semester
        return sem.id if sem else None

    def get_institution_name(self, obj):
        inst = obj.get_institution
        return inst.name if inst else None

    def get_department_name(self, obj):
        dept = obj.get_department
        return dept.name if dept else None

    def get_semester_number(self, obj):
        sem = obj.get_semester
        return sem.number if sem else None

    def get_assigned_courses(self, obj):
        if obj.role == "teacher":
            return [
                {
                    "id": c.id,
                    "name": c.name,
                    "department_name": c.department.name if c.department else None,
                    "section_name": c.section.name if c.section else None,
                }
                for c in obj.courses_taught.all()
            ]
        return []

    def get_enrolled_courses_count(self, obj):
        if obj.role == "student":
            return obj.enrollments.count()
        return 0

    def get_has_bound_device(self, obj):
        return bool(obj.bound_device_id)

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, 'role', 'student'))
        institution = attrs.get("institution", getattr(self.instance, 'institution', None))
        section = attrs.get("section", getattr(self.instance, 'section', None))

        if role == "student" and section:
            institution = section.semester.department.institution
            attrs["institution"] = None
            attrs["department"] = None

        # Only validate email domain if the email field is actually being changed
        # (skip during updates where email is unchanged to avoid false rejections)
        email_is_changing = "email" in attrs
        email = attrs.get("email") if email_is_changing else None

        if role == "student" and email_is_changing and email:
            if not institution:
                raise serializers.ValidationError({"email": "Students must be assigned to a section or institution to validate domain."})

            domain_suffix = institution.domain
            if not domain_suffix:
                domain_suffix = f"{institution.slug}.edu"

            domain_suffix = domain_suffix.strip().lower()
            email_val = email.strip().lower()

            if not email_val.endswith(f"@{domain_suffix}") and not email_val.endswith(f".{domain_suffix}"):
                raise serializers.ValidationError({
                    "email": f"Personal emails are not permitted. Students must use their institutional email address ending with '@{domain_suffix}'."
                })

        return attrs

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
    session_number = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ("id", "course", "course_name", "session_number", "start_time", "expiry_time")
        read_only_fields = ("id", "course_name", "session_number", "start_time")

    def get_session_number(self, obj):
        return AttendanceSession.objects.filter(
            course=obj.course,
            start_time__lte=obj.start_time
        ).count()
