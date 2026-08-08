"""
Custom JWT authentication that reads the access token from an HTTPOnly cookie
instead of (or in addition to) the Authorization header.
Falls back to the Authorization header so DRF Browsable API and Postman still work.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate via:
      1. access_token HTTPOnly cookie (preferred – XSS-safe)
      2. Authorization: Bearer <token> header (fallback for API clients / tests)
    """

    def authenticate(self, request):
        # --- Try cookie first ---
        raw_token = request.COOKIES.get("access_token")
        if raw_token:
            try:
                validated = self.get_validated_token(raw_token)
                return self.get_user(validated), validated
            except InvalidToken:
                # Cookie present but invalid/expired → fall through to header
                pass

        # --- Fall back to Authorization header ---
        return super().authenticate(request)
