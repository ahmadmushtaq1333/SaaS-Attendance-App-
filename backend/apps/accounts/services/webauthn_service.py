import os
from django.conf import settings
from django.core.cache import cache
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import RegistrationCredential, AuthenticationCredential, AuthenticatorSelectionCriteria, UserVerificationRequirement, PublicKeyCredentialDescriptor
from ..models.webauthn import WebAuthnCredential
from django.db import transaction

# Environment configuration for WebAuthn
RP_ID = os.environ.get("RP_ID", "localhost")
RP_NAME = os.environ.get("RP_NAME", "Quorum Attendance")
ORIGIN = os.environ.get("EXPECTED_ORIGIN", "http://localhost:5173")

class WebAuthnService:
    @staticmethod
    def generate_registration_challenge(user):
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user.id).encode("utf-8"),
            user_name=user.email,
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.PREFERRED
            ),
        )
        # Store challenge in cache for 90 seconds
        cache.set(f"webauthn_register_challenge_{user.id}", options.challenge, timeout=90)
        return options

    @staticmethod
    def verify_registration(user, response_data):
        expected_challenge = cache.get(f"webauthn_register_challenge_{user.id}")
        if not expected_challenge:
            raise ValueError("Registration challenge expired or not found.")
            
        # Delete on read (single-use)
        cache.delete(f"webauthn_register_challenge_{user.id}")

        verification = verify_registration_response(
            credential=response_data,
            expected_challenge=expected_challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            require_user_verification=False
        )

        return verification

    @staticmethod
    def generate_authentication_challenge(user):
        credentials = WebAuthnCredential.objects.filter(user=user)
        allow_credentials = [
            PublicKeyCredentialDescriptor(id=bytes.fromhex(cred.credential_id))
            for cred in credentials
        ]

        options = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
        )
        
        # Store challenge in cache for 90 seconds
        cache.set(f"webauthn_auth_challenge_{user.id}", options.challenge, timeout=90)
        return options

    @staticmethod
    def verify_authentication(user, response_data):
        expected_challenge = cache.get(f"webauthn_auth_challenge_{user.id}")
        if not expected_challenge:
            raise ValueError("Authentication challenge expired or not found.")
            
        # Delete on read (single-use)
        cache.delete(f"webauthn_auth_challenge_{user.id}")

        credential_id = response_data.get("id")
        if not credential_id:
            raise ValueError("Missing credential ID")

        with transaction.atomic():
            # Lock the row for update to prevent replay attacks via race condition
            # The client sends credential_id as Base64URL string (or plain string id). We need to map it back to hex to look up in DB.
            # Actually, we can just look it up if we convert the incoming ID to bytes then hex.
            # Wait, `py_webauthn` takes response_data which contains "id", it parses it.
            # To find the cred in DB safely, we can decode the incoming "id" (base64url) to bytes, then to hex.
            import base64
            # Add padding to base64url if needed
            padded_id = credential_id + "=" * ((4 - len(credential_id) % 4) % 4)
            cred_id_hex = base64.urlsafe_b64decode(padded_id).hex()
            
            cred = WebAuthnCredential.objects.select_for_update().filter(
                user=user, credential_id=cred_id_hex
            ).first()

            if not cred:
                raise ValueError("WebAuthn credential not found for this user.")

            verification = verify_authentication_response(
                credential=response_data,
                expected_challenge=expected_challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
                credential_public_key=bytes.fromhex(cred.public_key),
                credential_current_sign_count=cred.sign_count,
                require_user_verification=False
            )

            if verification.new_sign_count <= cred.sign_count and cred.sign_count != 0:
                # If sign_count is 0, the authenticator might not support it.
                # If it's > 0, we must strictly enforce it.
                if verification.new_sign_count > 0:
                    raise ValueError("Sign count is less than or equal to stored sign count. Potential replay attack.")
            
            # Update sign count
            cred.sign_count = verification.new_sign_count
            cred.save(update_fields=['sign_count', 'last_used'])

        return verification
