"""
Comprehensive test suite for WebAuthn device binding.

Coverage:
  1. WebAuthnService — unit tests (all service methods)
  2. CustomTokenObtainPairSerializer — WebAuthn pre-auth flow
  3. PreAuthMixin — token validation edge cases
  4. All four WebAuthn API views
  5. WebAuthnCredentialDeleteView
  6. Teacher/Admin login — must be completely unaffected
  7. DB integrity — credential uniqueness
"""

import base64
import uuid
import jwt
import time
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

from django.test import TestCase
from django.core.cache import cache
from django.conf import settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import CustomUser
from apps.accounts.models.webauthn import WebAuthnCredential
from apps.accounts.services.webauthn_service import WebAuthnService
from webauthn.registration.verify_registration_response import VerifiedRegistration
from webauthn.authentication.verify_authentication_response import VerifiedAuthentication


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def make_user(email, role="student", verified=True, password="testpass123"):
    user = CustomUser.objects.create_user(email=email, password=password, role=role)
    user.is_email_verified = verified
    user.save()
    return user


def make_pre_auth_token(user, jti=None, token_type="pre_auth", exp_seconds=90):
    if jti is None:
        jti = str(uuid.uuid4())
    exp = datetime.now(timezone.utc) + timedelta(seconds=exp_seconds)
    payload = {"token_type": token_type, "user_id": user.id, "jti": jti, "exp": exp}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    cache.set(f"pre_auth_jti_{jti}", True, timeout=exp_seconds)
    return token, jti


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


# ──────────────────────────────────────────────────────────────────────────────
# 1. WebAuthnService — unit tests
# ──────────────────────────────────────────────────────────────────────────────

class TestWebAuthnServiceRegistration(TestCase):
    def setUp(self):
        self.user = make_user("service_reg@test.com")
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.generate_registration_options")
    def test_challenge_stored_in_cache(self, mock_gen):
        mock_gen.return_value = MagicMock(challenge=b"reg_challenge")
        WebAuthnService.generate_registration_challenge(self.user)
        stored = cache.get(f"webauthn_register_challenge_{self.user.id}")
        self.assertEqual(stored, b"reg_challenge")

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_verify_registration_clears_challenge(self, mock_verify):
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"chal", timeout=90)
        mock_verify.return_value = MagicMock(
            spec=VerifiedRegistration, credential_id=b"cid", credential_public_key=b"cpk", sign_count=0
        )
        WebAuthnService.verify_registration(self.user, {"id": "cid"})
        self.assertIsNone(cache.get(f"webauthn_register_challenge_{self.user.id}"))

    def test_verify_registration_no_challenge_raises(self):
        with self.assertRaisesMessage(ValueError, "Registration challenge expired or not found."):
            WebAuthnService.verify_registration(self.user, {"id": "anything"})


class TestWebAuthnServiceAuthentication(TestCase):
    def setUp(self):
        self.user = make_user("service_auth@test.com")
        self.cred_bytes = b"credential_id_bytes"
        self.cred = WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=self.cred_bytes.hex(),
            public_key=b"public_key".hex(),
            sign_count=5,
        )
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.generate_authentication_options")
    def test_challenge_stored_in_cache(self, mock_gen):
        mock_gen.return_value = MagicMock(challenge=b"auth_chal")
        WebAuthnService.generate_authentication_challenge(self.user)
        self.assertEqual(cache.get(f"webauthn_auth_challenge_{self.user.id}"), b"auth_chal")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_successful_auth_updates_sign_count(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=10)
        cred_b64 = b64url(self.cred_bytes)
        WebAuthnService.verify_authentication(self.user, {"id": cred_b64})
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.sign_count, 10)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_replay_attack_rejected(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        # new_sign_count == stored sign_count (10 == 10) → replay
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=10)
        self.cred.sign_count = 10
        self.cred.save()
        with self.assertRaisesMessage(ValueError, "Potential replay attack"):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_lower_sign_count_rejected(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=3)
        self.cred.sign_count = 10
        self.cred.save()
        with self.assertRaisesMessage(ValueError, "Potential replay attack"):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})

    def test_expired_challenge_raises(self):
        with self.assertRaisesMessage(ValueError, "Authentication challenge expired or not found."):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})

    def test_missing_credential_id_raises(self):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        with self.assertRaisesMessage(ValueError, "Missing credential ID"):
            WebAuthnService.verify_authentication(self.user, {})

    def test_unknown_credential_raises(self):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        with self.assertRaisesMessage(ValueError, "WebAuthn credential not found"):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(b"nonexistent_id")})

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_zero_sign_count_not_rejected(self, mock_verify):
        """Authenticators that don't support sign count always return 0 — must NOT reject."""
        self.cred.sign_count = 0
        self.cred.save()
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=0)
        result = WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})
        self.assertIsNotNone(result)


# ──────────────────────────────────────────────────────────────────────────────
# 2. Serializer — pre-auth token generation for students
# ──────────────────────────────────────────────────────────────────────────────

class TestCustomTokenSerializer(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = "/api/auth/login/"
        cache.clear()

    def test_student_login_returns_pre_auth_not_access(self):
        user = make_user("student1@test.com", role="student")
        resp = self.client.post(self.login_url, {"email": user.email, "password": "testpass123"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("pre_auth_token", resp.data)
        self.assertTrue(resp.data.get("requires_webauthn"))
        self.assertNotIn("access", resp.data)
        self.assertNotIn("refresh", resp.data)

    def test_student_login_is_registered_false_when_no_credential(self):
        user = make_user("student2@test.com", role="student")
        resp = self.client.post(self.login_url, {"email": user.email, "password": "testpass123"})
        self.assertFalse(resp.data.get("is_registered"))

    def test_student_login_is_registered_true_when_credential_exists(self):
        user = make_user("student3@test.com", role="student")
        WebAuthnCredential.objects.create(
            user=user, credential_id=b"x".hex(), public_key=b"y".hex(), sign_count=0
        )
        resp = self.client.post(self.login_url, {"email": user.email, "password": "testpass123"})
        self.assertTrue(resp.data.get("is_registered"))

    def test_teacher_login_returns_access_token_directly(self):
        user = make_user("teacher1@test.com", role="teacher")
        resp = self.client.post(self.login_url, {"email": user.email, "password": "testpass123"})
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("pre_auth_token", resp.data)
        self.assertFalse(resp.data.get("requires_webauthn", False))

    def test_admin_login_returns_access_token_directly(self):
        user = make_user("admin1@test.com", role="admin")
        resp = self.client.post(self.login_url, {"email": user.email, "password": "testpass123"})
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("pre_auth_token", resp.data)
        self.assertFalse(resp.data.get("requires_webauthn", False))

    def test_pre_auth_token_jti_stored_in_cache(self):
        user = make_user("student4@test.com", role="student")
        resp = self.client.post(self.login_url, {"email": user.email, "password": "testpass123"})
        token = resp.data.get("pre_auth_token")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        jti = payload["jti"]
        self.assertTrue(cache.get(f"pre_auth_jti_{jti}"))

    def test_wrong_password_returns_401(self):
        user = make_user("student5@test.com", role="student")
        resp = self.client.post(self.login_url, {"email": user.email, "password": "wrongpass"})
        self.assertEqual(resp.status_code, 401)
        self.assertNotIn("pre_auth_token", resp.data)


# ──────────────────────────────────────────────────────────────────────────────
# 3. PreAuthMixin validation — endpoint-level token checks
# ──────────────────────────────────────────────────────────────────────────────

class TestPreAuthValidation(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("preauth@test.com", role="student")
        self.challenge_url = "/api/auth/webauthn/register/challenge/"
        cache.clear()

    def test_missing_auth_header_returns_401(self):
        resp = self.client.get(self.challenge_url)
        self.assertEqual(resp.status_code, 401)

    def test_standard_access_token_rejected(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        access = str(refresh.access_token)
        resp = self.client.get(self.challenge_url, HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid token type", resp.data.get("error", ""))

    def test_expired_pre_auth_token_returns_401(self):
        token, jti = make_pre_auth_token(self.user, exp_seconds=-1)  # already expired
        resp = self.client.get(self.challenge_url, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("expired", resp.data.get("error", "").lower())

    def test_tampered_token_returns_401(self):
        token, _ = make_pre_auth_token(self.user)
        tampered = token[:-5] + "XXXXX"
        resp = self.client.get(self.challenge_url, HTTP_AUTHORIZATION=f"Bearer {tampered}")
        self.assertEqual(resp.status_code, 401)

    def test_consumed_jti_returns_401(self):
        token, jti = make_pre_auth_token(self.user)
        cache.delete(f"pre_auth_jti_{jti}")  # simulate consumed
        resp = self.client.get(self.challenge_url, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("consumed", resp.data.get("error", "").lower())

    @patch("apps.accounts.services.webauthn_service.generate_registration_options")
    def test_valid_pre_auth_token_accepted(self, mock_gen):
        mock_gen.return_value = MagicMock(challenge=b"c", json=lambda: '{"challenge":"c"}')
        token, _ = make_pre_auth_token(self.user)
        resp = self.client.get(self.challenge_url, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 200)


# ──────────────────────────────────────────────────────────────────────────────
# 4. WebAuthn View flows
# ──────────────────────────────────────────────────────────────────────────────

class TestWebAuthnRegistrationFlow(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("regflow@test.com", role="student")
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.generate_registration_options")
    def test_challenge_view_returns_options(self, mock_gen):
        mock_gen.return_value = MagicMock(
            challenge=b"c",
            json=lambda: '{"challenge":"dGVzdA","rp":{"id":"localhost","name":"Quorum"}}'
        )
        token, _ = make_pre_auth_token(self.user)
        resp = self.client.get("/api/auth/webauthn/register/challenge/",
                               HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("challenge", resp.data)

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_verify_creates_credential_and_returns_tokens(self, mock_verify):
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"chal", timeout=90)
        mock_verify.return_value = MagicMock(
            spec=VerifiedRegistration,
            credential_id=b"cred_id_123",
            credential_public_key=b"pub_key_abc",
            sign_count=0,
        )
        token, jti = make_pre_auth_token(self.user)
        resp = self.client.post("/api/auth/webauthn/register/verify/",
                                {"id": "test", "type": "public-key"},
                                format="json",
                                HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertTrue(WebAuthnCredential.objects.filter(user=self.user).exists())

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_failed_verify_does_not_consume_token(self, mock_verify):
        """If Face ID fails, the pre-auth token must still be valid so student can retry."""
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"chal", timeout=90)
        mock_verify.side_effect = ValueError("Bad attestation")
        token, jti = make_pre_auth_token(self.user)
        resp = self.client.post("/api/auth/webauthn/register/verify/",
                                {"id": "test"},
                                format="json",
                                HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 400)
        # JTI must still be in cache
        self.assertTrue(cache.get(f"pre_auth_jti_{jti}"), "Token was consumed on failure — retry impossible!")


class TestWebAuthnAuthenticationFlow(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("authflow@test.com", role="student")
        self.cred_bytes = b"my_cred_id_bytes"
        self.cred = WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=self.cred_bytes.hex(),
            public_key=b"public_key".hex(),
            sign_count=3,
        )
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.generate_authentication_options")
    def test_challenge_view_returns_options(self, mock_gen):
        mock_gen.return_value = MagicMock(
            challenge=b"c",
            json=lambda: '{"challenge":"dGVzdA","allowCredentials":[]}'
        )
        token, _ = make_pre_auth_token(self.user)
        resp = self.client.get("/api/auth/webauthn/auth/challenge/",
                               HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 200)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_successful_auth_issues_tokens(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=10)
        token, jti = make_pre_auth_token(self.user)
        resp = self.client.post("/api/auth/webauthn/auth/verify/",
                                {"id": b64url(self.cred_bytes), "type": "public-key"},
                                format="json",
                                HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.sign_count, 10)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_failed_auth_does_not_consume_token(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.side_effect = Exception("Invalid signature")
        token, jti = make_pre_auth_token(self.user)
        resp = self.client.post("/api/auth/webauthn/auth/verify/",
                                {"id": b64url(self.cred_bytes)},
                                format="json",
                                HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(cache.get(f"pre_auth_jti_{jti}"), "Token was consumed on failure — retry impossible!")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_token_consumed_after_successful_auth(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=10)
        token, jti = make_pre_auth_token(self.user)
        self.client.post("/api/auth/webauthn/auth/verify/",
                         {"id": b64url(self.cred_bytes), "type": "public-key"},
                         format="json",
                         HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertIsNone(cache.get(f"pre_auth_jti_{jti}"), "Token was NOT consumed after success!")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_same_token_cannot_be_used_twice(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=10)
        token, jti = make_pre_auth_token(self.user)
        # First use
        self.client.post("/api/auth/webauthn/auth/verify/",
                         {"id": b64url(self.cred_bytes), "type": "public-key"},
                         format="json",
                         HTTP_AUTHORIZATION=f"Bearer {token}")
        # Second use — must fail
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal2", timeout=90)
        resp2 = self.client.post("/api/auth/webauthn/auth/verify/",
                                 {"id": b64url(self.cred_bytes)},
                                 format="json",
                                 HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp2.status_code, 401)
        self.assertIn("consumed", resp2.data.get("error", "").lower())


# ──────────────────────────────────────────────────────────────────────────────
# 5. Credential Delete View
# ──────────────────────────────────────────────────────────────────────────────

class TestWebAuthnCredentialDelete(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = make_user("delstudent@test.com", role="student")
        self.other_student = make_user("other@test.com", role="student")
        self.teacher = make_user("teacher@test.com", role="teacher")
        self.cred = WebAuthnCredential.objects.create(
            user=self.student, credential_id=b"d".hex(), public_key=b"p".hex(), sign_count=0
        )
        cache.clear()

    def test_student_can_delete_own_credential(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.delete(f"/api/auth/webauthn/credential/{self.cred.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(WebAuthnCredential.objects.filter(id=self.cred.id).exists())

    def test_student_cannot_delete_other_students_credential(self):
        self.client.force_authenticate(user=self.other_student)
        resp = self.client.delete(f"/api/auth/webauthn/credential/{self.cred.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_teacher_cannot_delete_student_credential(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.delete(f"/api/auth/webauthn/credential/{self.cred.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_cannot_delete(self):
        resp = self.client.delete(f"/api/auth/webauthn/credential/{self.cred.id}/")
        self.assertEqual(resp.status_code, 401)

    def test_delete_nonexistent_returns_404(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.delete("/api/auth/webauthn/credential/99999/")
        self.assertEqual(resp.status_code, 404)


# ──────────────────────────────────────────────────────────────────────────────
# 6. DB integrity
# ──────────────────────────────────────────────────────────────────────────────

class TestWebAuthnCredentialModel(TestCase):
    def setUp(self):
        self.user = make_user("dbtest@test.com", role="student")
        self.user2 = make_user("dbtest2@test.com", role="student")

    def test_credential_id_uniqueness_enforced(self):
        from django.db import IntegrityError
        WebAuthnCredential.objects.create(
            user=self.user, credential_id="aabbcc", public_key="pk1", sign_count=0
        )
        with self.assertRaises(IntegrityError):
            WebAuthnCredential.objects.create(
                user=self.user2, credential_id="aabbcc", public_key="pk2", sign_count=0
            )

    def test_student_can_have_multiple_credentials(self):
        WebAuthnCredential.objects.create(
            user=self.user, credential_id="dev1", public_key="pk1", sign_count=0
        )
        WebAuthnCredential.objects.create(
            user=self.user, credential_id="dev2", public_key="pk2", sign_count=0
        )
        self.assertEqual(WebAuthnCredential.objects.filter(user=self.user).count(), 2)

    def test_user_deletion_cascades_credentials(self):
        WebAuthnCredential.objects.create(
            user=self.user, credential_id="cascade1", public_key="pk", sign_count=0
        )
        uid = self.user.id
        self.user.delete()
        self.assertEqual(WebAuthnCredential.objects.filter(user_id=uid).count(), 0)


# ──────────────────────────────────────────────────────────────────────────────
# 7. Teacher / Admin — completely unaffected
# ──────────────────────────────────────────────────────────────────────────────

class TestTeacherAdminUnaffected(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_teacher_gets_jwt_directly(self):
        user = make_user("teachernowebauthn@test.com", role="teacher")
        resp = self.client.post("/api/auth/login/", {"email": user.email, "password": "testpass123"})
        self.assertEqual(resp.status_code, 200)
        # Must have full access token, not a passkey prompt
        self.assertFalse(resp.data.get("requires_webauthn", False))

    def test_admin_gets_jwt_directly(self):
        user = make_user("adminnowebauthn@test.com", role="admin")
        resp = self.client.post("/api/auth/login/", {"email": user.email, "password": "testpass123"})
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data.get("requires_webauthn", False))

    def test_teacher_cannot_access_webauthn_endpoints_with_access_token(self):
        """WebAuthn endpoints must reject standard access tokens — not just missing tokens."""
        from rest_framework_simplejwt.tokens import RefreshToken
        user = make_user("teacherwebauthnreject@test.com", role="teacher")
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        resp = self.client.get("/api/auth/webauthn/register/challenge/",
                               HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid token type", resp.data.get("error", ""))
