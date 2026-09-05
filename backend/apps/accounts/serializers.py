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
    device_id = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        device_id = attrs.pop("device_id", None)
        
        # Check authentication first
        data = super().validate(attrs)
        
        # Enforce email verification on login (exempting superusers and administrators)
        if not self.user.is_superuser and self.user.role != "admin" and not self.user.is_email_verified:
            raise serializers.ValidationError({
                "email_unverified": True,
                "detail": "Email address not verified yet. Please check your inbox for the activation OTP code."
            })
            
        # Device Binding Logic for Students
        if self.user.role == "student" and device_id:
            if not self.user.bound_device_id:
                # Bind this new device to the student
                self.user.bound_device_id = device_id
                self.user.save(update_fields=['bound_device_id'])
            elif self.user.bound_device_id != device_id:
                # Device mismatch - possible proxy attendance attempt
                raise serializers.ValidationError({
                    "device_mismatch": True,
                    "detail": "This account is registered to another device. Please use your original device or contact your teacher to reset your device binding."
                })
                
        return data

