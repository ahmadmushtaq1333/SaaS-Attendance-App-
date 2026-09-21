from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source="institution.name", read_only=True)

    class Meta:
        model = CustomUser
        fields = ("id", "email", "role", "institution", "institution_name", "date_joined", "is_superuser", "registration_number", "is_email_verified")
        read_only_fields = ("id", "date_joined", "is_superuser")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Check authentication first
        data = super().validate(attrs)
        
        # Enforce email verification on login (exempting superusers and administrators)
        if not self.user.is_superuser and self.user.role != "admin" and not self.user.is_email_verified:
            raise serializers.ValidationError({
                "email_unverified": True,
                "detail": "Email address not verified yet. Please check your inbox for the activation OTP code."
            })
            
        # Device Binding Logic for Students
        if self.user.role == "student":
            from .device_binding import DeviceBindingService
            from .daily_device_lock import DailyDeviceLockService
            request = self.context.get("request")
            user_agent = request.META.get("HTTP_USER_AGENT", "") if request else ""

            # Policy 2 runs FIRST — if this is a proxy attempt, reject immediately
            # before any binding record is written (otherwise blocked logins would
            # permanently bind the wrong device to the account).
            device_fingerprint = request.data.get("device_fingerprint", "") if request else ""
            DailyDeviceLockService.verify(self.user, device_fingerprint)

            # Policy 1: permanent per-account device binding (runs only if lock passed)
            # Cookie takes priority (web). Fall back to JSON body (mobile clients).
            incoming_token = (request.COOKIES.get("device_token") or request.data.get("device_token")) if request else None
            canonical_token = DeviceBindingService.verify_or_bind(
                self.user, incoming_token, user_agent
            )
            data["_device_token"] = canonical_token

        return data


