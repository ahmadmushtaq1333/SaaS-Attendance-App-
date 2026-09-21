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
    registration_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    is_email_verified = models.BooleanField(default=False)
    
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
    
    # Device Binding for Students (anti-proxy attendance)
    # (Removed bound_device_id, migrated to DeviceBinding)

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


class EmailVerificationCode(models.Model):
    PURPOSE_CHOICES = (
        ("verify", "Verification"),
        ("reset", "Password Reset"),
        ("rebind", "Device Rebind"),
    )
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="verification_codes")
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default="verify")
    failed_attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.email} - {self.code} ({self.purpose})"


import uuid

class DeviceBinding(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="device_binding")
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    user_agent = models.TextField(blank=True)

    def __str__(self):
        return f"Binding for {self.user.email}"


class DailyDeviceLock(models.Model):
    """
    Enforces one-account-per-device-per-day policy for students.
    Records the first student account that logs in from a given device
    fingerprint on a given UTC calendar date. Any subsequent login attempt
    from the same fingerprint on the same day with a DIFFERENT account is
    rejected, preventing proxy attendance via a friend's phone.

    The fingerprint is a SHA-256 hash of stable browser/device signals
    computed client-side and sent in the login request body.
    """
    device_fingerprint = models.CharField(max_length=64, db_index=True)  # SHA-256 hex = 64 chars
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="daily_device_locks")
    date = models.DateField()  # UTC calendar date of first login

    class Meta:
        unique_together = ("device_fingerprint", "date")

    def __str__(self):
        return f"{self.user.email} on {self.date} [{self.device_fingerprint[:8]}…]"
