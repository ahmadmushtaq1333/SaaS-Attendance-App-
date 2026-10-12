"""
Regression & comprehensive tests for the passkey (WebAuthn) bug-fix.

Bugs fixed:
  A. Challenge was deleted BEFORE verify — a dismissed biometric prompt destroyed
     the challenge permanently, forcing students to restart from the login form.
     Fix: challenge is now deleted only on SUCCESSFUL verification.

  B. RP_ID / EXPECTED_ORIGIN were not set in production, defaulting to
     'localhost' / 'http://localhost:5173', causing every prod student to fail.
     Fix: auto-derive from VERCEL_DOMAIN env var; explicit vars still override.

New test groups:
  8.  Challenge survives failed verification (the core bug — retry must work)
  9.  Multi-retry flows (fail N times, succeed on final attempt)
  10. Challenge isolation between concurrent students
  11. RP_ID / EXPECTED_ORIGIN environment derivation logic
  12. No credential created on registration verify failure
  13. Auth challenge survives all failure modes (sign-count, unknown cred, etc.)
  14. End-to-end full login round-trip (login → challenge → verify → /me/)
"""

import base64
import uuid
import jwt
import os
from unittest.mock import patch, MagicMock, call
from datetime import datetime, timedelta, timezone

from django.test import TestCase, override_settings
from django.core.cache import cache
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.accounts.models.webauthn import WebAuthnCredential
from apps.accounts.services.webauthn_service import WebAuthnService
from webauthn.registration.verify_registration_response import VerifiedRegistration
from webauthn.authentication.verify_authentication_response import VerifiedAuthentication


# ──────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────────────────────────────────────

def make_user(email, role="student", verified=True, password="testpass123"):
    user = CustomUser.objects.create_user(email=email, password=password, role=role)
    user.is_email_verified = verified
    user.save()
    return user


def make_pre_auth_token(user, jti=None, exp_seconds=90):
    if jti is None:
        jti = str(uuid.uuid4())
    exp = datetime.now(timezone.utc) + timedelta(seconds=exp_seconds)
    payload = {"token_type": "pre_auth", "user_id": user.id, "jti": jti, "exp": exp}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    cache.set(f"pre_auth_jti_{jti}", True, timeout=exp_seconds)
    return token, jti


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def make_cred(user, cred_bytes=b"default_cred_id", sign_count=5):
    return WebAuthnCredential.objects.create(
        user=user,
        credential_id=cred_bytes.hex(),
        public_key=b"public_key_bytes".hex(),
        sign_count=sign_count,
    )


def good_verify_auth(new_sign_count=10):
    return MagicMock(spec=VerifiedAuthentication, new_sign_count=new_sign_count)


def good_verify_reg():
    return MagicMock(
        spec=VerifiedRegistration,
        credential_id=b"new_cred_id",
        credential_public_key=b"new_pub_key",
        sign_count=0,
    )


# ──────────────────────────────────────────────────────────────────────────────
# 8. Challenge survives failed verification (THE CORE BUG)
# ──────────────────────────────────────────────────────────────────────────────

class TestRegistrationChallengeSurvivesFailure(TestCase):
    """
    BUG A — Registration path.
    Before the fix: cache.delete() was called before verify_registration_response().
    If biometrics were dismissed, the challenge was gone and the student was locked out.
    After the fix: challenge is deleted only on success.
    """

    def setUp(self):
        self.user = make_user("reg_retry@test.com")
        cache.clear()

    def _seed_challenge(self):
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"challenge_bytes", timeout=90)

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_challenge_still_in_cache_after_verify_raises(self, mock_verify):
        """A ValueError from py_webauthn must NOT destroy the challenge."""
        self._seed_challenge()
        mock_verify.side_effect = ValueError("Invalid attestation object")

        with self.assertRaises(ValueError):
            WebAuthnService.verify_registration(self.user, {"id": "test"})

        self.assertIsNotNone(
            cache.get(f"webauthn_register_challenge_{self.user.id}"),
            "Challenge was deleted on failure — retry is impossible (THE BUG)."
        )

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_challenge_still_in_cache_after_generic_exception(self, mock_verify):
        """Any unexpected exception must also leave the challenge intact."""
        self._seed_challenge()
        mock_verify.side_effect = Exception("Unexpected error")

        with self.assertRaises(Exception):
            WebAuthnService.verify_registration(self.user, {"id": "test"})

        self.assertIsNotNone(
            cache.get(f"webauthn_register_challenge_{self.user.id}"),
            "Challenge was deleted on unexpected exception."
        )

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_challenge_deleted_only_on_success(self, mock_verify):
        """Challenge must be present before success and gone after."""
        self._seed_challenge()
        mock_verify.return_value = good_verify_reg()

        self.assertIsNotNone(cache.get(f"webauthn_register_challenge_{self.user.id}"))
        WebAuthnService.verify_registration(self.user, {"id": "test"})
        self.assertIsNone(
            cache.get(f"webauthn_register_challenge_{self.user.id}"),
            "Challenge was NOT cleaned up after successful registration."
        )

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_challenge_not_reused_after_success(self, mock_verify):
        """Once consumed on success, a second verify attempt must see 'expired'."""
        self._seed_challenge()
        mock_verify.return_value = good_verify_reg()
        WebAuthnService.verify_registration(self.user, {"id": "test"})

        mock_verify.return_value = good_verify_reg()
        with self.assertRaisesMessage(ValueError, "Registration challenge expired or not found."):
            WebAuthnService.verify_registration(self.user, {"id": "test"})


class TestAuthenticationChallengeSurvivesFailure(TestCase):
    """
    BUG A — Authentication path.
    Same bug: challenge was deleted before verification succeeded.
    """

    def setUp(self):
        self.user = make_user("auth_retry@test.com")
        self.cred_bytes = b"auth_retry_cred"
        self.cred = make_cred(self.user, self.cred_bytes, sign_count=5)
        cache.clear()

    def _seed_challenge(self):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_challenge", timeout=90)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_challenge_survives_invalid_signature(self, mock_verify):
        """py_webauthn raising on bad signature must NOT destroy the challenge."""
        self._seed_challenge()
        mock_verify.side_effect = Exception("Invalid signature")

        with self.assertRaises(Exception):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})

        self.assertIsNotNone(
            cache.get(f"webauthn_auth_challenge_{self.user.id}"),
            "Auth challenge was deleted on signature failure — retry is impossible (THE BUG)."
        )

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_challenge_survives_replay_attack_rejection(self, mock_verify):
        """A replay-attack rejection must NOT destroy the challenge."""
        self.cred.sign_count = 10
        self.cred.save()
        self._seed_challenge()
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=10)

        with self.assertRaises(ValueError):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})

        self.assertIsNotNone(
            cache.get(f"webauthn_auth_challenge_{self.user.id}"),
            "Auth challenge was deleted on replay rejection."
        )

    def test_challenge_survives_unknown_credential(self):
        """An unknown credential_id must NOT destroy the challenge."""
        self._seed_challenge()

        with self.assertRaisesMessage(ValueError, "WebAuthn credential not found"):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(b"unknown_cred")})

        self.assertIsNotNone(
            cache.get(f"webauthn_auth_challenge_{self.user.id}"),
            "Auth challenge was deleted on unknown credential."
        )

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_challenge_deleted_only_on_success(self, mock_verify):
        """Challenge must be present before and gone after a successful auth."""
        self._seed_challenge()
        mock_verify.return_value = good_verify_auth(new_sign_count=6)

        self.assertIsNotNone(cache.get(f"webauthn_auth_challenge_{self.user.id}"))
        WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})
        self.assertIsNone(
            cache.get(f"webauthn_auth_challenge_{self.user.id}"),
            "Auth challenge was NOT cleaned up after success."
        )

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_challenge_not_reused_after_success(self, mock_verify):
        """Once consumed on success, a second verify must see 'expired'."""
        self._seed_challenge()
        mock_verify.return_value = good_verify_auth(new_sign_count=6)
        WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})

        with self.assertRaisesMessage(ValueError, "Authentication challenge expired or not found."):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})


# ──────────────────────────────────────────────────────────────────────────────
# 9. Multi-retry flows  (fail N times, succeed on the Nth+1 attempt)
# ──────────────────────────────────────────────────────────────────────────────

class TestMultiRetryRegistrationFlow(TestCase):
    """
    Simulates the real student journey: dismiss biometrics twice, succeed third time.
    Each button press = get_challenge + verify in one shot (as the frontend does).
    This was completely broken before the fix.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("retry_reg@test.com")
        cache.clear()
        self.token, self.jti = make_pre_auth_token(self.user)

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    @patch("apps.accounts.views_webauthn.options_to_json",
           return_value='{"challenge":"dGVzdA","rp":{"id":"localhost","name":"Quorum"}}')
    @patch("apps.accounts.services.webauthn_service.generate_registration_options")
    def test_two_failures_then_success(self, mock_gen, mock_json, mock_verify):
        mock_gen.return_value = MagicMock(challenge=b"chal")

        # ── Attempt 1: biometric dismissed → verify fails ─────────────────────
        mock_verify.side_effect = Exception("NotAllowedError")
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"chal", timeout=90)
        resp1 = self.client.post(
            "/api/auth/webauthn/register/verify/",
            {"id": "attempt1"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp1.status_code, 400, "First failure should return 400")
        # Pre-auth token must still be valid
        self.assertTrue(
            cache.get(f"pre_auth_jti_{self.jti}"),
            "Pre-auth token was consumed after first failure — no more retries possible."
        )
        # Challenge must survive so a new button-press doesn't need to re-login
        self.assertIsNotNone(
            cache.get(f"webauthn_register_challenge_{self.user.id}"),
            "Challenge was destroyed after first failure — retry impossible (THE BUG)."
        )

        # ── Attempt 2: finger slipped → verify fails again ────────────────────
        mock_verify.side_effect = Exception("AbortError")
        resp2 = self.client.post(
            "/api/auth/webauthn/register/verify/",
            {"id": "attempt2"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp2.status_code, 400, "Second failure should return 400")
        self.assertIsNotNone(
            cache.get(f"webauthn_register_challenge_{self.user.id}"),
            "Challenge was destroyed after second failure."
        )

        # ── Attempt 3: success ─────────────────────────────────────────────────
        mock_verify.side_effect = None
        mock_verify.return_value = good_verify_reg()
        resp3 = self.client.post(
            "/api/auth/webauthn/register/verify/",
            {"id": "attempt3", "type": "public-key"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp3.status_code, 200, "Third attempt (success) must return 200")
        self.assertIn("access", resp3.data)
        self.assertTrue(
            WebAuthnCredential.objects.filter(user=self.user).exists(),
            "Credential was not created after successful registration."
        )
        # Pre-auth token must now be consumed
        self.assertIsNone(
            cache.get(f"pre_auth_jti_{self.jti}"),
            "Pre-auth token was NOT consumed after success."
        )
        # Challenge must now be gone
        self.assertIsNone(
            cache.get(f"webauthn_register_challenge_{self.user.id}"),
            "Registration challenge was NOT cleaned up after success."
        )


class TestMultiRetryAuthenticationFlow(TestCase):
    """Same retry scenario for the authentication (verify) path."""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("retry_auth@test.com")
        self.cred_bytes = b"retry_auth_cred"
        self.cred = make_cred(self.user, self.cred_bytes, sign_count=3)
        cache.clear()
        self.token, self.jti = make_pre_auth_token(self.user)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_two_failures_then_success(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)

        # ── Attempt 1: bad signature ───────────────────────────────────────────
        mock_verify.side_effect = Exception("Invalid cbor")
        resp1 = self.client.post(
            "/api/auth/webauthn/auth/verify/",
            {"id": b64url(self.cred_bytes)},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp1.status_code, 400)
        self.assertTrue(cache.get(f"pre_auth_jti_{self.jti}"), "Token consumed on failure 1.")
        self.assertIsNotNone(
            cache.get(f"webauthn_auth_challenge_{self.user.id}"),
            "Auth challenge destroyed on failure 1 — retry impossible (THE BUG)."
        )

        # ── Attempt 2: another bad signature ──────────────────────────────────
        mock_verify.side_effect = Exception("Bad user presence")
        resp2 = self.client.post(
            "/api/auth/webauthn/auth/verify/",
            {"id": b64url(self.cred_bytes)},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp2.status_code, 400)
        self.assertIsNotNone(
            cache.get(f"webauthn_auth_challenge_{self.user.id}"),
            "Auth challenge destroyed on failure 2."
        )

        # ── Attempt 3: success ─────────────────────────────────────────────────
        mock_verify.side_effect = None
        mock_verify.return_value = good_verify_auth(new_sign_count=4)
        resp3 = self.client.post(
            "/api/auth/webauthn/auth/verify/",
            {"id": b64url(self.cred_bytes), "type": "public-key"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp3.status_code, 200, "Third attempt must succeed.")
        self.assertIn("access", resp3.data)
        self.assertIsNone(cache.get(f"pre_auth_jti_{self.jti}"), "Token not consumed after success.")
        self.assertIsNone(cache.get(f"webauthn_auth_challenge_{self.user.id}"), "Challenge not cleaned up.")
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.sign_count, 4)


# ──────────────────────────────────────────────────────────────────────────────
# 10. Challenge isolation — two students must not see each other's challenges
# ──────────────────────────────────────────────────────────────────────────────

class TestChallengeConcurrentIsolation(TestCase):
    """
    Two students logging in at the same time must have completely separate
    challenge namespaces. A failure for one must not affect the other.
    """

    def setUp(self):
        self.alice = make_user("alice@test.com")
        self.bob = make_user("bob@test.com")
        self.alice_cred_bytes = b"alice_cred_id"
        self.bob_cred_bytes = b"bob_cred_id"
        make_cred(self.alice, self.alice_cred_bytes)
        make_cred(self.bob, self.bob_cred_bytes)
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_alice_failure_does_not_affect_bobs_challenge(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.alice.id}", b"alice_chal", timeout=90)
        cache.set(f"webauthn_auth_challenge_{self.bob.id}", b"bob_chal", timeout=90)

        # Alice's verify fails
        mock_verify.side_effect = Exception("Alice's phone died")
        with self.assertRaises(Exception):
            WebAuthnService.verify_authentication(self.alice, {"id": b64url(self.alice_cred_bytes)})

        # Bob's challenge must be completely untouched
        self.assertEqual(
            cache.get(f"webauthn_auth_challenge_{self.bob.id}"),
            b"bob_chal",
            "Bob's challenge was affected by Alice's failure."
        )
        # Alice's challenge must still exist (retry)
        self.assertIsNotNone(
            cache.get(f"webauthn_auth_challenge_{self.alice.id}"),
            "Alice's challenge was destroyed — she can't retry."
        )

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_alice_success_does_not_delete_bobs_challenge(self, mock_verify):
        cache.set(f"webauthn_auth_challenge_{self.alice.id}", b"alice_chal", timeout=90)
        cache.set(f"webauthn_auth_challenge_{self.bob.id}", b"bob_chal", timeout=90)

        mock_verify.return_value = good_verify_auth(new_sign_count=6)
        WebAuthnService.verify_authentication(self.alice, {"id": b64url(self.alice_cred_bytes)})

        # Alice's challenge gone (consumed)
        self.assertIsNone(cache.get(f"webauthn_auth_challenge_{self.alice.id}"))
        # Bob's challenge untouched
        self.assertEqual(cache.get(f"webauthn_auth_challenge_{self.bob.id}"), b"bob_chal")

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_registration_challenges_are_isolated(self, mock_verify):
        cache.set(f"webauthn_register_challenge_{self.alice.id}", b"alice_reg_chal", timeout=90)
        cache.set(f"webauthn_register_challenge_{self.bob.id}", b"bob_reg_chal", timeout=90)

        # Alice fails
        mock_verify.side_effect = Exception("attestation error")
        with self.assertRaises(Exception):
            WebAuthnService.verify_registration(self.alice, {"id": "alice_attempt"})

        self.assertIsNotNone(cache.get(f"webauthn_register_challenge_{self.alice.id}"))
        self.assertEqual(cache.get(f"webauthn_register_challenge_{self.bob.id}"), b"bob_reg_chal")


# ──────────────────────────────────────────────────────────────────────────────
# 11. RP_ID / EXPECTED_ORIGIN environment variable derivation (BUG B)
# ──────────────────────────────────────────────────────────────────────────────

class TestWebAuthnEnvDerivation(TestCase):
    """
    The service reads RP_ID / ORIGIN at module import time from os.environ.
    We test the derivation logic by re-importing with patched env vars.
    """

    def _reload_service_vars(self, env_patch):
        """
        Re-evaluate the module-level expressions under a patched environment.
        Returns (rp_id, origin) as the service would compute them.
        """
        import importlib
        import apps.accounts.services.webauthn_service as svc_mod
        with patch.dict(os.environ, env_patch, clear=False):
            importlib.reload(svc_mod)
            rp_id = svc_mod.RP_ID
            origin = svc_mod.ORIGIN
        # Reload back to clean state
        importlib.reload(svc_mod)
        return rp_id, origin

    def test_defaults_to_localhost_when_no_env(self):
        env = {"VERCEL_DOMAIN": "", "RP_ID": "", "EXPECTED_ORIGIN": ""}
        rp_id, origin = self._reload_service_vars(env)
        self.assertEqual(rp_id, "localhost")
        self.assertEqual(origin, "http://localhost:5173")

    def test_vercel_domain_auto_derives_rp_id_and_origin(self):
        """BUG B fix: VERCEL_DOMAIN alone must be enough for production."""
        env = {"VERCEL_DOMAIN": "quorum-app.vercel.app", "RP_ID": "", "EXPECTED_ORIGIN": ""}
        rp_id, origin = self._reload_service_vars(env)
        self.assertEqual(rp_id, "quorum-app.vercel.app",
                         "RP_ID should be derived from VERCEL_DOMAIN")
        self.assertEqual(origin, "https://quorum-app.vercel.app",
                         "EXPECTED_ORIGIN should be https:// + VERCEL_DOMAIN")

    def test_explicit_rp_id_overrides_vercel_domain(self):
        """Explicit RP_ID must take precedence over VERCEL_DOMAIN."""
        env = {
            "VERCEL_DOMAIN": "quorum-app.vercel.app",
            "RP_ID": "custom-domain.edu",
            "EXPECTED_ORIGIN": "",
        }
        rp_id, origin = self._reload_service_vars(env)
        self.assertEqual(rp_id, "custom-domain.edu")
        # EXPECTED_ORIGIN still falls back to VERCEL_DOMAIN if not set
        self.assertEqual(origin, "https://quorum-app.vercel.app")

    def test_explicit_expected_origin_overrides_vercel_domain(self):
        """Explicit EXPECTED_ORIGIN must take precedence."""
        env = {
            "VERCEL_DOMAIN": "quorum-app.vercel.app",
            "RP_ID": "",
            "EXPECTED_ORIGIN": "https://custom.edu",
        }
        rp_id, origin = self._reload_service_vars(env)
        self.assertEqual(rp_id, "quorum-app.vercel.app")
        self.assertEqual(origin, "https://custom.edu")

    def test_all_explicit_overrides_ignore_vercel_domain(self):
        """When both explicit vars are set, VERCEL_DOMAIN is irrelevant."""
        env = {
            "VERCEL_DOMAIN": "quorum-app.vercel.app",
            "RP_ID": "myuni.edu",
            "EXPECTED_ORIGIN": "https://myuni.edu",
        }
        rp_id, origin = self._reload_service_vars(env)
        self.assertEqual(rp_id, "myuni.edu")
        self.assertEqual(origin, "https://myuni.edu")


# ──────────────────────────────────────────────────────────────────────────────
# 12. No credential created on verify failure
# ──────────────────────────────────────────────────────────────────────────────

class TestNoPartialStateOnFailure(TestCase):
    """
    A failed registration must leave the DB completely unchanged.
    We don't want half-created credentials that confuse is_registered.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("nopartial@test.com")
        cache.clear()
        self.token, self.jti = make_pre_auth_token(self.user)

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_no_credential_created_on_registration_failure(self, mock_verify):
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"chal", timeout=90)
        mock_verify.side_effect = ValueError("Bad attestation")

        resp = self.client.post(
            "/api/auth/webauthn/register/verify/",
            {"id": "bad_cred"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(
            WebAuthnCredential.objects.filter(user=self.user).exists(),
            "A WebAuthnCredential was created despite verification failure."
        )
        # is_registered must still be False on next login
        resp2 = self.client.post("/api/auth/login/", {"email": self.user.email, "password": "testpass123"})
        self.assertFalse(resp2.data.get("is_registered"), "is_registered should still be False after failed reg.")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_sign_count_not_updated_on_auth_failure(self, mock_verify):
        cred_bytes = b"nopartial_cred"
        cred = make_cred(self.user, cred_bytes, sign_count=7)
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"auth_chal", timeout=90)
        mock_verify.side_effect = Exception("Signature check failed")

        with self.assertRaises(Exception):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(cred_bytes)})

        cred.refresh_from_db()
        self.assertEqual(cred.sign_count, 7, "sign_count was mutated despite auth failure.")


# ──────────────────────────────────────────────────────────────────────────────
# 13. All auth failure modes leave challenge intact (comprehensive)
# ──────────────────────────────────────────────────────────────────────────────

class TestAuthChallengeIntactAfterAllFailureModes(TestCase):
    """
    Every conceivable failure path in verify_authentication must leave the
    cache challenge untouched so the student can try again.
    """

    def setUp(self):
        self.user = make_user("failmodes@test.com")
        self.cred_bytes = b"failmode_cred"
        self.cred = make_cred(self.user, self.cred_bytes, sign_count=5)
        cache.clear()

    def _seed(self):
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"chal", timeout=90)

    def _challenge_intact(self):
        return cache.get(f"webauthn_auth_challenge_{self.user.id}") is not None

    def test_missing_credential_id_leaves_challenge(self):
        self._seed()
        with self.assertRaises(ValueError):
            WebAuthnService.verify_authentication(self.user, {})
        self.assertTrue(self._challenge_intact(), "Challenge destroyed on missing credential_id.")

    def test_unknown_credential_leaves_challenge(self):
        self._seed()
        with self.assertRaises(ValueError):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(b"unknown_bytes")})
        self.assertTrue(self._challenge_intact(), "Challenge destroyed on unknown credential.")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_crypto_failure_leaves_challenge(self, mock_verify):
        self._seed()
        mock_verify.side_effect = Exception("cbor decode error")
        with self.assertRaises(Exception):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})
        self.assertTrue(self._challenge_intact(), "Challenge destroyed on crypto failure.")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_equal_sign_count_leaves_challenge(self, mock_verify):
        self.cred.sign_count = 5
        self.cred.save()
        self._seed()
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=5)
        with self.assertRaises(ValueError):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})
        self.assertTrue(self._challenge_intact(), "Challenge destroyed on equal sign_count (replay).")

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_lower_sign_count_leaves_challenge(self, mock_verify):
        self.cred.sign_count = 10
        self.cred.save()
        self._seed()
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=3)
        with self.assertRaises(ValueError):
            WebAuthnService.verify_authentication(self.user, {"id": b64url(self.cred_bytes)})
        self.assertTrue(self._challenge_intact(), "Challenge destroyed on lower sign_count.")


# ──────────────────────────────────────────────────────────────────────────────
# 14. Full end-to-end round-trip (login → challenge → verify → /me/)
# ──────────────────────────────────────────────────────────────────────────────

class TestEndToEndRegistrationRoundTrip(TestCase):
    """
    Simulates the complete first-login flow for a new student:
    POST /auth/login/ → GET register/challenge/ → POST register/verify/ → GET /auth/me/
    """

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("e2e_reg@test.com")
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    @patch("apps.accounts.views_webauthn.options_to_json",
           return_value='{"challenge":"dGVzdA","rp":{"id":"localhost","name":"Quorum"}}')
    @patch("apps.accounts.services.webauthn_service.generate_registration_options")
    def test_full_registration_flow(self, mock_gen, mock_json, mock_verify):
        mock_gen.return_value = MagicMock(challenge=b"e2e_chal")
        mock_verify.return_value = good_verify_reg()

        # Step 1: Login — must get pre_auth_token, not access token
        resp_login = self.client.post("/api/auth/login/", {
            "email": self.user.email, "password": "testpass123"
        })
        self.assertEqual(resp_login.status_code, 200)
        self.assertIn("pre_auth_token", resp_login.data)
        self.assertFalse(resp_login.data.get("is_registered"))
        pre_auth = resp_login.data["pre_auth_token"]

        # Step 2: Get registration challenge
        resp_chal = self.client.get(
            "/api/auth/webauthn/register/challenge/",
            HTTP_AUTHORIZATION=f"Bearer {pre_auth}",
        )
        self.assertEqual(resp_chal.status_code, 200)

        # Seed challenge in cache (normally done by the challenge view calling generate_registration_challenge)
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"e2e_chal", timeout=90)

        # Step 3: Verify registration → receive access + refresh
        resp_verify = self.client.post(
            "/api/auth/webauthn/register/verify/",
            {"id": "e2e_cred", "type": "public-key"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {pre_auth}",
        )
        self.assertEqual(resp_verify.status_code, 200)
        self.assertIn("access", resp_verify.data)
        self.assertIn("refresh", resp_verify.data)
        access_token = resp_verify.data["access"]

        # Step 4: Use the issued access token to hit /auth/me/
        resp_me = self.client.get(
            "/api/auth/me/",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(resp_me.status_code, 200)
        self.assertEqual(resp_me.data["email"], self.user.email)
        self.assertEqual(resp_me.data["role"], "student")

        # Credential must now exist in DB
        self.assertTrue(WebAuthnCredential.objects.filter(user=self.user).exists())


class TestEndToEndAuthenticationRoundTrip(TestCase):
    """
    Simulates the complete return-login flow for a registered student:
    POST /auth/login/ → GET auth/challenge/ → POST auth/verify/ → GET /auth/me/
    """

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("e2e_auth@test.com")
        self.cred_bytes = b"e2e_auth_cred"
        self.cred = make_cred(self.user, self.cred_bytes, sign_count=3)
        cache.clear()

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    @patch("apps.accounts.views_webauthn.options_to_json",
           return_value='{"challenge":"dGVzdA","allowCredentials":[]}')
    @patch("apps.accounts.services.webauthn_service.generate_authentication_options")
    def test_full_authentication_flow(self, mock_gen, mock_json, mock_verify):
        mock_gen.return_value = MagicMock(challenge=b"e2e_auth_chal")
        mock_verify.return_value = good_verify_auth(new_sign_count=4)

        # Step 1: Login → pre_auth_token with is_registered=True
        resp_login = self.client.post("/api/auth/login/", {
            "email": self.user.email, "password": "testpass123"
        })
        self.assertEqual(resp_login.status_code, 200)
        self.assertTrue(resp_login.data.get("is_registered"),
                        "is_registered must be True for a student with a credential.")
        pre_auth = resp_login.data["pre_auth_token"]

        # Step 2: Get authentication challenge
        resp_chal = self.client.get(
            "/api/auth/webauthn/auth/challenge/",
            HTTP_AUTHORIZATION=f"Bearer {pre_auth}",
        )
        self.assertEqual(resp_chal.status_code, 200)

        # Seed challenge (the challenge view calls generate_authentication_challenge which stores it)
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"e2e_auth_chal", timeout=90)

        # Step 3: Verify authentication → receive access + refresh
        resp_verify = self.client.post(
            "/api/auth/webauthn/auth/verify/",
            {"id": b64url(self.cred_bytes), "type": "public-key"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {pre_auth}",
        )
        self.assertEqual(resp_verify.status_code, 200)
        self.assertIn("access", resp_verify.data)
        access_token = resp_verify.data["access"]

        # Step 4: Use issued access token
        resp_me = self.client.get(
            "/api/auth/me/",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(resp_me.status_code, 200)
        self.assertEqual(resp_me.data["email"], self.user.email)

        # Sign count must be updated
        self.cred.refresh_from_db()
        self.assertEqual(self.cred.sign_count, 4)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    @patch("apps.accounts.views_webauthn.options_to_json",
           return_value='{"challenge":"dGVzdA","allowCredentials":[]}')
    @patch("apps.accounts.services.webauthn_service.generate_authentication_options")
    def test_retry_then_succeed_full_flow(self, mock_gen, mock_json, mock_verify):
        """Retry: fail → fail → succeed. Student logs in successfully on third attempt."""
        mock_gen.return_value = MagicMock(challenge=b"retry_chal")

        resp_login = self.client.post("/api/auth/login/", {
            "email": self.user.email, "password": "testpass123"
        })
        pre_auth = resp_login.data["pre_auth_token"]

        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"retry_chal", timeout=90)

        # Fail 1
        mock_verify.side_effect = Exception("Bad user verification flag")
        self.client.post("/api/auth/webauthn/auth/verify/",
                         {"id": b64url(self.cred_bytes)}, format="json",
                         HTTP_AUTHORIZATION=f"Bearer {pre_auth}")

        # Fail 2
        mock_verify.side_effect = Exception("Authenticator data too short")
        self.client.post("/api/auth/webauthn/auth/verify/",
                         {"id": b64url(self.cred_bytes)}, format="json",
                         HTTP_AUTHORIZATION=f"Bearer {pre_auth}")

        # Verify pre-auth token still usable
        from apps.accounts.views_webauthn import PreAuthMixin
        dummy = type("R", (), {"headers": {"Authorization": f"Bearer {pre_auth}"}})()
        mixin = PreAuthMixin()
        user_out, jti_out, error_out = mixin.get_user_from_pre_auth(dummy)
        self.assertIsNone(error_out, f"Pre-auth token unusable after 2 failures: {error_out}")

        # Succeed
        mock_verify.side_effect = None
        mock_verify.return_value = good_verify_auth(new_sign_count=4)
        resp_ok = self.client.post("/api/auth/webauthn/auth/verify/",
                                   {"id": b64url(self.cred_bytes), "type": "public-key"},
                                   format="json",
                                   HTTP_AUTHORIZATION=f"Bearer {pre_auth}")
        self.assertEqual(resp_ok.status_code, 200, "Must succeed after 2 prior failures.")
        self.assertIn("access", resp_ok.data)


# ──────────────────────────────────────────────────────────────────────────────
# 15. Bad Paths, Platform Passkeys, Admin Controls & 1-Try Verification
# ──────────────────────────────────────────────────────────────────────────────

class TestReRegistrationReplacesStalePasskeys(TestCase):
    """
    CRITICAL POLICY: Exactly 1 clean active device passkey per student.
    When a student re-registers, old credentials must be automatically purged
    so allowCredentials only queries the active device (eliminates multi-attempt lag).
    """

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("replace_test@test.com")
        cache.clear()
        self.token, self.jti = make_pre_auth_token(self.user)

    @patch("apps.accounts.services.webauthn_service.verify_registration_response")
    def test_re_registration_purges_old_credentials(self, mock_verify):
        # Create 2 stale/old credentials
        old1 = make_cred(self.user, b"old_phone_1", sign_count=10)
        old2 = make_cred(self.user, b"old_phone_2", sign_count=20)
        self.assertEqual(WebAuthnCredential.objects.filter(user=self.user).count(), 2)

        # Seed new registration challenge
        cache.set(f"webauthn_register_challenge_{self.user.id}", b"new_chal", timeout=300)

        # Student registers on their new phone
        mock_verify.return_value = MagicMock(
            spec=VerifiedRegistration,
            credential_id=b"new_phone_active",
            credential_public_key=b"new_pub_key",
            sign_count=0,
        )

        resp = self.client.post(
            "/api/auth/webauthn/register/verify/",
            {"id": "new_phone_cred", "type": "public-key"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp.status_code, 200)

        # Database must now contain EXACTLY 1 credential (the active one)
        creds = WebAuthnCredential.objects.filter(user=self.user)
        self.assertEqual(creds.count(), 1)
        self.assertEqual(creds.first().credential_id, b"new_phone_active".hex())

        # Authentication challenge must only contain the single active device descriptor
        options = WebAuthnService.generate_authentication_challenge(self.user)
        self.assertEqual(len(options.allow_credentials), 1)
        self.assertEqual(options.allow_credentials[0].id, b"new_phone_active")


class TestPlatformPasskeySignCountZeroSafe(TestCase):
    """
    Multi-device / synced platform passkeys (Google Password Manager, Apple Keychain)
    standardly return sign_count = 0 per W3C WebAuthn Level 3.
    Authentication MUST NOT raise a replay error when incoming count is 0,
    even if the database had a stored positive count from previous registration.
    """

    def setUp(self):
        self.user = make_user("platform_passkey@test.com")
        self.cred_bytes = b"platform_cred_id"
        self.cred = make_cred(self.user, self.cred_bytes, sign_count=5)
        cache.clear()
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"chal", timeout=300)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_sign_count_zero_authenticates_successfully(self, mock_verify):
        # Platform authenticator returns sign_count = 0
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=0)

        # Must succeed without raising replay attack ValueError
        verification = WebAuthnService.verify_authentication(
            self.user, {"id": b64url(self.cred_bytes)}
        )
        self.assertEqual(verification.new_sign_count, 0)

        # Database record must be preserved and last_used updated
        self.cred.refresh_from_db()
        self.assertIsNotNone(self.cred.last_used)

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_hardware_token_monotonic_counter_still_enforced_when_positive(self, mock_verify):
        # When both the stored count and incoming count are positive, replay is strictly detected
        self.cred.sign_count = 10
        self.cred.save()
        mock_verify.return_value = MagicMock(spec=VerifiedAuthentication, new_sign_count=8)

        with self.assertRaisesMessage(ValueError, "Potential replay attack"):
            WebAuthnService.verify_authentication(
                self.user, {"id": b64url(self.cred_bytes)}
            )


class TestAdminPasskeyReset(TestCase):
    """
    When a student loses or replaces their phone mid-semester, an admin can
    click 'Reset Passkey' in the admin dashboard to free the student.
    """

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user("admin@test.com", role="admin")
        self.student = make_user("student_lost_phone@test.com", role="student")
        make_cred(self.student, b"lost_phone_credential")
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_reset_student_passkey(self):
        self.assertTrue(WebAuthnCredential.objects.filter(user=self.student).exists())

        resp = self.client.post(f"/api/admin/users/{self.student.id}/reset-passkey/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Passkey reset successfully", resp.data.get("message", ""))

        # Credential is completely removed
        self.assertFalse(WebAuthnCredential.objects.filter(user=self.student).exists())

        # Next login: is_registered is False, student is directed to set up new phone
        login_resp = self.client.post("/api/auth/login/", {
            "email": self.student.email, "password": "testpass123"
        })
        self.assertEqual(login_resp.status_code, 200)
        self.assertTrue(login_resp.data.get("requires_webauthn"))
        self.assertFalse(login_resp.data.get("is_registered"))

    def test_admin_reset_device_also_clears_passkey(self):
        self.assertTrue(WebAuthnCredential.objects.filter(user=self.student).exists())

        resp = self.client.post(f"/api/admin/users/{self.student.id}/reset-device/")
        self.assertEqual(resp.status_code, 200)

        # Both device binding and passkey credentials are wiped
        self.assertFalse(WebAuthnCredential.objects.filter(user=self.student).exists())

    def test_admin_serializer_exposes_has_passkey_field(self):
        from apps.accounts.serializers_admin import UserAdminSerializer
        data = UserAdminSerializer(self.student).data
        self.assertIn("has_passkey", data)
        self.assertTrue(data["has_passkey"])

        WebAuthnCredential.objects.filter(user=self.student).delete()
        data2 = UserAdminSerializer(self.student).data
        self.assertFalse(data2["has_passkey"])


class TestBadPathsAndEdgeCases(TestCase):
    """
    Negative tests:
    - Token expired after timeout
    - Biometric dismissed (NotAllowedError) leaves pre-auth token valid
    - In-app browser / malformed requests rejected safely
    """

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("badpaths@test.com")
        cache.clear()
        self.token, self.jti = make_pre_auth_token(self.user, exp_seconds=300)

    def test_expired_pre_auth_token_returns_401(self):
        # Create an expired token (-10 seconds)
        expired_token, _ = make_pre_auth_token(self.user, exp_seconds=-10)
        resp = self.client.get(
            "/api/auth/webauthn/auth/challenge/",
            HTTP_AUTHORIZATION=f"Bearer {expired_token}"
        )
        self.assertEqual(resp.status_code, 401)
        self.assertIn("expired", resp.data.get("error", "").lower())

    def test_pre_auth_token_jti_cleared_returns_401(self):
        # Invalidate JTI from cache (as if consumed or manually revoked)
        cache.delete(f"pre_auth_jti_{self.jti}")
        resp = self.client.get(
            "/api/auth/webauthn/auth/challenge/",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )
        self.assertEqual(resp.status_code, 401)
        self.assertIn("consumed or expired", resp.data.get("error", "").lower())

    @patch("apps.accounts.services.webauthn_service.verify_authentication_response")
    def test_biometric_dismissal_preserves_pre_auth_token_for_retry(self, mock_verify):
        cred_bytes = b"dismiss_cred"
        make_cred(self.user, cred_bytes)
        cache.set(f"webauthn_auth_challenge_{self.user.id}", b"chal", timeout=300)

        # Student dismisses biometric (simulated by crypto failure / abort)
        mock_verify.side_effect = Exception("NotAllowedError: The operation either timed out or was not allowed.")

        resp = self.client.post(
            "/api/auth/webauthn/auth/verify/",
            {"id": b64url(cred_bytes)},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )
        self.assertEqual(resp.status_code, 400)

        # Pre-auth JTI must STILL be intact in cache
        self.assertTrue(cache.get(f"pre_auth_jti_{self.jti}"))

        # Challenge must STILL be in cache
        self.assertIsNotNone(cache.get(f"webauthn_auth_challenge_{self.user.id}"))

        # Student retries with PIN/pattern -> succeeds
        mock_verify.side_effect = None
        mock_verify.return_value = good_verify_auth(new_sign_count=0)
        retry_resp = self.client.post(
            "/api/auth/webauthn/auth/verify/",
            {"id": b64url(cred_bytes), "type": "public-key"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )
        self.assertEqual(retry_resp.status_code, 200)
        self.assertIn("access", retry_resp.data)
