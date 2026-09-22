from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import UserSerializer, CustomTokenObtainPairSerializer
from shared.ratelimit import simple_ratelimit
from shared.cookie_utils import get_cookie_policy

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    @simple_ratelimit(rate='10/m')
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            device_token = response.data.pop('_device_token', None)
            is_secure, samesite_policy = get_cookie_policy(request)
            
            if access_token:
                response.set_cookie(
                    'access_token', access_token, max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                    httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
                )
            if refresh_token:
                response.set_cookie(
                    'refresh_token', refresh_token, max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
                    httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
                )
            if device_token:
                response.set_cookie(
                    'device_token', str(device_token), max_age=31536000,
                    httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
                )
            response.data['access'] = access_token
            response.data['refresh'] = refresh_token
        return response


class CookieTokenRefreshView(TokenRefreshView):
    @simple_ratelimit(rate='10/m')
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            request.data['refresh'] = refresh_token
        
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            is_secure, samesite_policy = get_cookie_policy(request)
            
            if access_token:
                response.set_cookie(
                    'access_token', access_token, max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                    httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
                )
            response.data['access'] = access_token
            
            new_refresh_token = response.data.get('refresh')
            if new_refresh_token:
                response.set_cookie(
                    'refresh_token', new_refresh_token, max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
                    httponly=True, samesite=samesite_policy, secure=is_secure, path='/'
                )
                response.data['refresh'] = new_refresh_token
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        response = Response({"message": "Successfully logged out."})
        is_secure, samesite_policy = get_cookie_policy(request)

        for cookie_name in ['access_token', 'refresh_token']:
            response.set_cookie(
                cookie_name,
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                path='/',
                httponly=True,
                samesite=samesite_policy,
                secure=is_secure,
            )
            response.delete_cookie(cookie_name, path='/', samesite=samesite_policy)

        return response
