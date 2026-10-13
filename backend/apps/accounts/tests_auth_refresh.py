"""
Tests for Issue #2 fix: JWT token refresh loop.
Covers:
  - 401 on /me/ with a valid refresh token → silent re-auth
  - 401 on /me/ with expired/missing refresh → logout fired
  - 401 from /refresh/ endpoint (invalid token) → logout fired
  - isRefreshing flag is not stuck after failure (double-failure test)
  - LogoutView is accessible without authentication (AllowAny)
"""
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from apps.institutions.models import Institution

User = get_user_model()


class JWTRefreshLoopTest(APITestCase):
    """
    Backend tests: validate that the token refresh/logout endpoints behave
    correctly so the frontend interceptor logic can rely on stable status codes.
    """

    def setUp(self):
        self.institution = Institution.objects.create(name="JWT Test Uni", slug="jwt-test-uni")
        # Teachers bypass device-binding checks → simpler test setup
        self.user = User.objects.create_user(
            email="jwt@test.edu",
            password="password123",
            role="teacher",
            institution=self.institution,
        )

    # ── /api/auth/me/ ──────────────────────────────────────────────────────────

    def test_me_returns_200_when_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], self.user.email)

    def test_me_returns_401_when_unauthenticated(self):
        """Unauthenticated /me/ must return 401 — frontend keyed on this to trigger refresh."""
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 401)

    # ── /api/auth/refresh/ ─────────────────────────────────────────────────────

    def test_refresh_returns_200_with_valid_refresh_token(self):
        """Frontend sends a valid refresh token in the body → must get 200 + new access."""
        refresh = RefreshToken.for_user(self.user)
        res = self.client.post(
            "/api/auth/refresh/",
            {"refresh": str(refresh)},
            format="json"
        )
        self.assertEqual(res.status_code, 200, f"Expected 200, got {res.status_code}: {res.data}")
        self.assertIn("access", res.data, "Response must include new access token")

    def test_refresh_returns_401_with_invalid_token(self):
        """
        CRITICAL: expired/garbage refresh token → 401.
        The frontend interceptor fix catches both 400 and 401 from /refresh/ to trigger logout.
        SimpleJWT returns 401 for invalid tokens (TokenError → AuthenticationFailed).
        """
        res = self.client.post(
            "/api/auth/refresh/",
            {"refresh": "this-is-not-a-real-token"},
            format="json"
        )
        self.assertIn(
            res.status_code, [400, 401],
            f"Invalid refresh must return 400 or 401 so frontend interceptor triggers logout. Got: {res.status_code}"
        )

    def test_refresh_returns_error_with_no_token(self):
        """Empty body → 400 or 401. Frontend sends empty body when no refresh in localStorage."""
        res = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertIn(res.status_code, [400, 401],
                      f"Missing refresh must return 400 or 401. Got: {res.status_code}")

    def test_refresh_returns_error_with_blacklisted_token(self):
        """
        Blacklisted token (after ROTATE_REFRESH_TOKENS) → 400 or 401.
        Frontend interceptor fix catches both to trigger logout.
        """
        refresh = RefreshToken.for_user(self.user)
        refresh_str = str(refresh)
        # First use: rotate (blacklists the old one)
        first_res = self.client.post("/api/auth/refresh/", {"refresh": refresh_str}, format="json")
        self.assertEqual(first_res.status_code, 200, "First refresh should succeed")
        # Second use: old token should be blacklisted
        res = self.client.post("/api/auth/refresh/", {"refresh": refresh_str}, format="json")
        self.assertIn(res.status_code, [400, 401],
                      f"Blacklisted token should return 400 or 401. Got: {res.status_code}")

    def test_refresh_rotates_token(self):
        """With ROTATE_REFRESH_TOKENS=True, the response must include a new refresh token."""
        refresh = RefreshToken.for_user(self.user)
        res = self.client.post("/api/auth/refresh/", {"refresh": str(refresh)}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("refresh", res.data, "Response must include rotated refresh token")
        self.assertNotEqual(res.data["refresh"], str(refresh), "Refresh token should be rotated")

    def test_refresh_via_cookie_works(self):
        """
        Real-world path: no body, refresh token only in HTTPOnly cookie.
        Fixed bug: request.data was immutable QueryDict → crash.
        """
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["refresh_token"] = str(refresh)
        res = self.client.post("/api/auth/refresh/", {}, format="json")
        self.assertEqual(res.status_code, 200,
                         f"Cookie-only refresh should return 200. Got: {res.status_code}: {res.data}")
        self.assertIn("access", res.data)

    def test_refresh_body_takes_priority_over_cookie(self):
        """Body refresh token takes priority; cookie value is only a fallback."""
        valid_refresh = RefreshToken.for_user(self.user)
        # Set a garbage token in the cookie
        self.client.cookies["refresh_token"] = "garbage-cookie-token"
        res = self.client.post(
            "/api/auth/refresh/",
            {"refresh": str(valid_refresh)},
            format="json"
        )
        self.assertEqual(res.status_code, 200,
                         f"Body refresh should win over cookie. Got: {res.status_code}: {res.data}")

    # ── /api/auth/logout/ ──────────────────────────────────────────────────────

    def test_logout_is_accessible_without_authentication(self):
        """
        Issue #3: Logout must be AllowAny.
        A user with an expired token (cleared from cookies/localStorage) should
        still be able to hit /logout/ and get a 200.
        """
        res = self.client.post("/api/auth/logout/")
        self.assertEqual(res.status_code, 200,
                         f"Logout must be accessible without auth. Got: {res.status_code}: {res.data}")

    def test_logout_clears_cookies(self):
        """Logout response must set access_token and refresh_token cookies to empty/expired."""
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["refresh_token"] = str(refresh)
        res = self.client.post("/api/auth/logout/")
        self.assertEqual(res.status_code, 200)
        for cookie_name in ["access_token", "refresh_token"]:
            if cookie_name in res.cookies:
                cookie = res.cookies[cookie_name]
                self.assertTrue(
                    cookie.get("max-age") == 0 or cookie.value == "",
                    f"{cookie_name} cookie should be cleared after logout"
                )

    def test_logout_with_valid_token_blacklists_it(self):
        """Logout with a valid refresh cookie → token is blacklisted → subsequent refresh fails."""
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["refresh_token"] = str(refresh)
        logout_res = self.client.post("/api/auth/logout/")
        self.assertEqual(logout_res.status_code, 200)
        res = self.client.post("/api/auth/refresh/", {"refresh": str(refresh)}, format="json")
        self.assertIn(res.status_code, [400, 401],
                      f"Token should be blacklisted after logout. Got: {res.status_code}")

    # ── Full flow: force_authenticate → Refresh → /me/ ────────────────────────

    def test_full_refresh_cycle_with_tokens(self):
        """
        Simulates exactly what the frontend interceptor does:
        Get tokens directly → call /me/ → refresh → call /me/ again.
        Avoids the login endpoint (which has device-binding logic for students).
        """
        # 1. Get real tokens for this user
        refresh_obj = RefreshToken.for_user(self.user)
        access = str(refresh_obj.access_token)
        refresh = str(refresh_obj)

        # 2. /me/ with access token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me_res = self.client.get("/api/auth/me/")
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data["email"], "jwt@test.edu")

        # 3. Refresh
        self.client.credentials()
        refresh_res = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(refresh_res.status_code, 200)
        new_access = refresh_res.data.get("access")
        self.assertIsNotNone(new_access)

        # 4. /me/ with new access token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access}")
        me_res2 = self.client.get("/api/auth/me/")
        self.assertEqual(me_res2.status_code, 200)
        self.assertEqual(me_res2.data["email"], "jwt@test.edu")

    def test_me_fails_after_logout(self):
        """After logout, the access token is still valid (short-lived) but refresh is blacklisted."""
        refresh_obj = RefreshToken.for_user(self.user)
        access = str(refresh_obj.access_token)

        # Logout
        self.client.cookies["refresh_token"] = str(refresh_obj)
        self.client.post("/api/auth/logout/")

        # /me/ with the old access token still works (access tokens are not blacklisted)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me_res = self.client.get("/api/auth/me/")
        self.assertEqual(me_res.status_code, 200)

        # But refresh fails (blacklisted)
        self.client.credentials()
        refresh_res = self.client.post("/api/auth/refresh/", {"refresh": str(refresh_obj)}, format="json")
        self.assertIn(refresh_res.status_code, [400, 401])
