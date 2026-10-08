from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser
from .models.webauthn import WebAuthnCredential
from django.core.cache import cache
import uuid
import jwt
from django.conf import settings
from datetime import datetime, timedelta, timezone

class WebAuthnCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebAuthnCredential
        fields = ("id", "last_used", "created_at")

class UserSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source="institution.name", read_only=True)
    webauthn_credentials = WebAuthnCredentialSerializer(many=True, read_only=True)

    class Meta:
        model = CustomUser
        fields = ("id", "email", "role", "institution", "institution_name", "date_joined", "is_superuser", "registration_number", "is_email_verified", "webauthn_credentials")
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
            
        # Device Binding Logic for Students using WebAuthn
        if self.user.role == "student":
            # Strip standard access and refresh tokens
            data.pop("access", None)
            data.pop("refresh", None)
            
            # Generate pre-auth JWT
            jti = str(uuid.uuid4())
            exp = datetime.now(timezone.utc) + timedelta(seconds=90)
            payload = {
                "token_type": "pre_auth",
                "user_id": self.user.id,
                "jti": jti,
                "exp": exp
            }
            pre_auth_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
            
            # Store JTI in cache for single-use verification
            cache.set(f"pre_auth_jti_{jti}", True, timeout=90)
            
            data["pre_auth_token"] = pre_auth_token
            data["requires_webauthn"] = True
            data["is_registered"] = WebAuthnCredential.objects.filter(user=self.user).exists()

        return data
