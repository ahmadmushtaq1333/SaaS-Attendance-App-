from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.core.cache import cache
import jwt
import logging
from django.conf import settings
from .models import CustomUser
from .models.webauthn import WebAuthnCredential
from .services.webauthn_service import WebAuthnService
from rest_framework_simplejwt.tokens import RefreshToken
import json
from webauthn import options_to_json
from shared.cookie_utils import get_cookie_policy

logger = logging.getLogger(__name__)


class PreAuthMixin:
    """
    Validates a pre-auth JWT present in the Authorization: Bearer header.
    Returns (user, jti) on success, or (None, error_message) on failure.
    Does NOT consume the JTI — consuming is the responsibility of the
    Verify views (after cryptographic verification succeeds).
    """
    def get_user_from_pre_auth(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None, None, "Missing or invalid Authorization header"

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return None, None, "Pre-auth token expired"
        except jwt.InvalidTokenError:
            return None, None, "Invalid pre-auth token"

        if payload.get("token_type") != "pre_auth":
            return None, None, "Invalid token type — standard access tokens are not accepted here"

        jti = payload.get("jti")
        cache_key = f"pre_auth_jti_{jti}"
        if not cache.get(cache_key):
            return None, None, "Pre-auth token already consumed or expired"

        user_id = payload.get("user_id")
        user = CustomUser.objects.filter(id=user_id).first()
        if not user:
            return None, None, "User not found"

        return user, jti, None


class WebAuthnRegistrationChallengeView(APIView, PreAuthMixin):
    authentication_classes = []  # Bypass DRF JWT auth — we validate pre_auth token manually
    permission_classes = [AllowAny]

    def get(self, request):
        user, jti, error = self.get_user_from_pre_auth(request)
        if error:
            return Response({"error": error}, status=status.HTTP_401_UNAUTHORIZED)

        from .services.webauthn_service import RP_ID, ORIGIN
        logger.info("[WebAuthn] Register challenge issued: user=%s rp_id=%s origin=%s", user.email, RP_ID, ORIGIN)
        options = WebAuthnService.generate_registration_challenge(user)
        return Response(json.loads(options_to_json(options)))


class WebAuthnRegistrationVerifyView(APIView, PreAuthMixin):
    authentication_classes = []  # Bypass DRF JWT auth — we validate pre_auth token manually
    permission_classes = [AllowAny]

    def post(self, request):
        user, jti, error = self.get_user_from_pre_auth(request)
        if error:
            return Response({"error": error}, status=status.HTTP_401_UNAUTHORIZED)

        response_data = request.data
        if settings.DEBUG and response_data.get("dev_bypass"):
            cache.delete(f"pre_auth_jti_{jti}")
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            response = Response({
                "access": access_token,
                "refresh": refresh_token,
            })
            is_secure, samesite_policy = get_cookie_policy(request)
            response.set_cookie(
                'access_token', access_token, max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
            )
            response.set_cookie(
                'refresh_token', refresh_token, max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
                httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
            )
            return response

        try:
            verification = WebAuthnService.verify_registration(user, response_data)
        except Exception as e:
            # Log exact py_webauthn rejection so it appears in Railway / Sentry
            logger.error("[WebAuthn] Registration FAILED for user=%s : %s", user.email, str(e), exc_info=True)
            # Token NOT consumed — student can retry
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Only consume the token on full success
        cache.delete(f"pre_auth_jti_{jti}")

        from django.db import transaction
        with transaction.atomic():
            # Replace existing credentials so only the active device is stored
            WebAuthnCredential.objects.filter(user=user).delete()

            WebAuthnCredential.objects.create(
                user=user,
                credential_id=verification.credential_id.hex(),
                public_key=verification.credential_public_key.hex(),
                sign_count=verification.sign_count,
            )

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        response = Response({
            "access": access_token,
            "refresh": refresh_token,
        })
        is_secure, samesite_policy = get_cookie_policy(request)
        response.set_cookie(
            'access_token', access_token, max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
        )
        response.set_cookie(
            'refresh_token', refresh_token, max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
        )
        return response


class WebAuthnAuthenticationChallengeView(APIView, PreAuthMixin):
    authentication_classes = []  # Bypass DRF JWT auth — we validate pre_auth token manually
    permission_classes = [AllowAny]

    def get(self, request):
        user, jti, error = self.get_user_from_pre_auth(request)
        if error:
            return Response({"error": error}, status=status.HTTP_401_UNAUTHORIZED)

        from .services.webauthn_service import RP_ID, ORIGIN
        logger.info("[WebAuthn] Auth challenge issued: user=%s rp_id=%s origin=%s", user.email, RP_ID, ORIGIN)
        options = WebAuthnService.generate_authentication_challenge(user)
        return Response(json.loads(options_to_json(options)))


class WebAuthnAuthenticationVerifyView(APIView, PreAuthMixin):
    authentication_classes = []  # Bypass DRF JWT auth — we validate pre_auth token manually
    permission_classes = [AllowAny]

    def post(self, request):
        user, jti, error = self.get_user_from_pre_auth(request)
        if error:
            return Response({"error": error}, status=status.HTTP_401_UNAUTHORIZED)

        response_data = request.data
        if settings.DEBUG and response_data.get("dev_bypass"):
            cache.delete(f"pre_auth_jti_{jti}")
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            response = Response({
                "access": access_token,
                "refresh": refresh_token,
            })
            is_secure, samesite_policy = get_cookie_policy(request)
            response.set_cookie(
                'access_token', access_token, max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
            )
            response.set_cookie(
                'refresh_token', refresh_token, max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
                httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
            )
            return response

        try:
            verification = WebAuthnService.verify_authentication(user, response_data)
        except Exception as e:
            # Log exact py_webauthn rejection so it appears in Railway / Sentry
            logger.error("[WebAuthn] Authentication FAILED for user=%s : %s", user.email, str(e), exc_info=True)
            # Token NOT consumed — student can retry
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Only consume the token on full success
        cache.delete(f"pre_auth_jti_{jti}")

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        response = Response({
            "access": access_token,
            "refresh": refresh_token,
        })
        is_secure, samesite_policy = get_cookie_policy(request)
        response.set_cookie(
            'access_token', access_token, max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
        )
        response.set_cookie(
            'refresh_token', refresh_token, max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
        )
        return response


class WebAuthnCredentialDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != "student":
            return Response(
                {"error": "Only students can manage WebAuthn devices."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            cred = WebAuthnCredential.objects.get(id=pk, user=request.user)
            cred.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WebAuthnCredential.DoesNotExist:
            return Response({"error": "Credential not found."}, status=status.HTTP_404_NOT_FOUND)
