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
        
        # Enforce email verification on login
        if not self.user.is_email_verified:
            raise serializers.ValidationError({
                "email_unverified": True,
                "detail": "Email address not verified yet. Please check your inbox for the activation OTP code."
            })
        return data

