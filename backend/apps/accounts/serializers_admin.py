from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

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
    bound_since = serializers.SerializerMethodField()
    device_last_seen = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "role", "institution", "institution_name",
            "department", "department_name", "semester_number",
            "section", "section_name", "is_active", "date_joined", "password",
            "registration_number", "is_email_verified",
            "has_bound_device", "bound_since", "device_last_seen", "assigned_courses", "enrolled_courses_count",
            "computed_institution", "computed_department", "computed_semester"
        )
        read_only_fields = ("id", "date_joined", "has_bound_device", "bound_since", "device_last_seen", "assigned_courses", "enrolled_courses_count")

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
        return hasattr(obj, 'device_binding')

    def get_bound_since(self, obj):
        if hasattr(obj, 'device_binding'):
            return obj.device_binding.created_at
        return None

    def get_device_last_seen(self, obj):
        if hasattr(obj, 'device_binding'):
            return obj.device_binding.last_seen
        return None

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, 'role', 'student'))
        institution = attrs.get("institution", getattr(self.instance, 'institution', None))
        section = attrs.get("section", getattr(self.instance, 'section', None))

        if role == "student" and section:
            institution = section.get_institution()
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
