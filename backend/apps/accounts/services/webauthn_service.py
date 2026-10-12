import os
from django.conf import settings
from django.core.cache import cache
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import (
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)
from ..models.webauthn import WebAuthnCredential
from django.db import transaction

# Environment configuration for WebAuthn
# RP_ID must be the bare domain (no scheme, no port) that students visit.
# EXPECTED_ORIGIN must be the full origin (scheme + domain) students visit.
# If not explicitly set, fall back to deriving them from VERCEL_DOMAIN (the
# frontend domain already required for CORS), so Railway only needs one var.
_vercel_domain = os.environ.get("VERCEL_DOMAIN", "")
RP_ID = os.environ.get("RP_ID") or _vercel_domain or "localhost"
RP_NAME = os.environ.get("RP_NAME", "Quorum Attendance")
ORIGIN = os.environ.get("EXPECTED_ORIGIN") or (f"https://{_vercel_domain}" if _vercel_domain else "http://localhost:5173")

# NIST SP 800-63B compliant session TTL (5 minutes) for student accessibility and retries
CHALLENGE_TIMEOUT_SECONDS = 300


class WebAuthnService:
    @staticmethod
    def generate_registration_challenge(user):
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user.id).encode("utf-8"),
            user_name=user.email,
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
            timeout=120000,
        )
        # Store challenge in cache for 5 minutes (300 seconds)
        cache.set(f"webauthn_register_challenge_{user.id}", options.challenge, timeout=CHALLENGE_TIMEOUT_SECONDS)
        return options

    @staticmethod
    def verify_registration(user, response_data):
        expected_challenge = cache.get(f"webauthn_register_challenge_{user.id}")
        if not expected_challenge:
            raise ValueError("Registration challenge expired or not found.")

        verification = verify_registration_response(
            credential=response_data,
            expected_challenge=expected_challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            require_user_verification=False
        )

        # Delete only after successful verification (single-use)
        # Deleting before verification means a dismissed/failed biometric prompt
        # permanently destroys the challenge, making retries impossible.
        cache.delete(f"webauthn_register_challenge_{user.id}")

        return verification

    @staticmethod
    def generate_authentication_challenge(user):
        # Fetch user's credentials ordered with most recently used first
        credentials = WebAuthnCredential.objects.filter(user=user).order_by("-last_used", "-created_at")
        allow_credentials = [
            PublicKeyCredentialDescriptor(id=bytes.fromhex(cred.credential_id))
            for cred in credentials
        ]

        options = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
            timeout=120000,
        )
        
        # Store challenge in cache for 5 minutes (300 seconds)
        cache.set(f"webauthn_auth_challenge_{user.id}", options.challenge, timeout=CHALLENGE_TIMEOUT_SECONDS)
        return options

    @staticmethod
    def verify_authentication(user, response_data):
        expected_challenge = cache.get(f"webauthn_auth_challenge_{user.id}")
        if not expected_challenge:
            raise ValueError("Authentication challenge expired or not found.")

        credential_id = response_data.get("id")
        if not credential_id:
            raise ValueError("Missing credential ID")

        with transaction.atomic():
            # Lock the row for update to prevent replay attacks via race condition
            import base64
            # Add padding to base64url if needed
            padded_id = credential_id + "=" * ((4 - len(credential_id) % 4) % 4)
            cred_id_hex = base64.urlsafe_b64decode(padded_id).hex()
            
            cred = WebAuthnCredential.objects.select_for_update().filter(
                user=user, credential_id=cred_id_hex
            ).first()

            if not cred:
                raise ValueError("WebAuthn credential not found for this user.")

            # Pass credential_current_sign_count=0 to py_webauthn so multi-device platform
            # passkeys (which return sign_count = 0 per W3C WebAuthn Level 3) do not trigger
            # false replay rejections. Strict monotonic check is handled below.
            verification = verify_authentication_response(
                credential=response_data,
                expected_challenge=expected_challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
                credential_public_key=bytes.fromhex(cred.public_key),
                credential_current_sign_count=0,
                require_user_verification=False
            )

            # Monotonic counter check: only enforced if authenticator actually uses hardware counters
            # (i.e. both counts are positive). Platform passkeys returning 0 are always permitted.
            if verification.new_sign_count > 0 and cred.sign_count > 0:
                if verification.new_sign_count <= cred.sign_count:
                    raise ValueError("Sign count is less than or equal to stored sign count. Potential replay attack.")

            # Delete only after successful verification (single-use challenge)
            cache.delete(f"webauthn_auth_challenge_{user.id}")

            # Update sign count and last used timestamp
            if verification.new_sign_count > 0:
                cred.sign_count = verification.new_sign_count
            cred.save(update_fields=['sign_count', 'last_used'])

        return verification

