from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from apps.institutions.models import Institution, Department, Semester, Section

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    )
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    
    # Institution is direct for admin/teachers, and derived for students.
    # To keep database constraints clean, we can make it nullable.
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True, related_name="users"
    )
    # Department is direct for teachers, and derived for students.
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )
    # Only students have a section. Semester and Department are derived from Section.
    section = models.ForeignKey(
        Section, on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    @property
    def get_institution(self):
        if self.role == "student" and self.section:
            return self.section.semester.department.institution
        return self.institution

    @property
    def get_department(self):
        if self.role == "student" and self.section:
            return self.section.semester.department
        return self.department

    @property
    def get_semester(self):
        if self.role == "student" and self.section:
            return self.section.semester
        return None


    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.role})"
