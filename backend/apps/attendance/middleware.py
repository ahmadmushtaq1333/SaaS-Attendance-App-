"""
WebSocket JWT and Cookie Authentication Middleware.

Authenticates incoming WebSocket connections by inspecting:
1. "access_token" in the HTTP Cookie header (standard web client with HttpOnly cookie)
2. "token" or "access_token" in the URL query string (explicit bearer query param)
"""
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


@database_sync_to_async
def get_user_from_jwt(token_string):
    """Decodes JWT access token and retrieves the associated active user."""
    User = get_user_model()
    try:
        validated_token = AccessToken(token_string)
        user_id = validated_token.get("user_id")
        user = User.objects.get(id=user_id)
        if not user.is_active:
            return AnonymousUser()
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, Exception):
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Custom Channels middleware that authenticates users via JWT in cookies or query params.
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # 1. Attempt extracting token from query parameters: ?token=<jwt> or ?access_token=<jwt>
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = None

        if "token" in query_params:
            token = query_params["token"][0]
        elif "access_token" in query_params:
            token = query_params["access_token"][0]

        # 2. If not in query params, inspect cookie header
        if not token:
            headers = dict(scope.get("headers", []))
            cookie_header = headers.get(b"cookie", b"").decode("utf-8")
            if cookie_header:
                cookies = {}
                for item in cookie_header.split(";"):
                    if "=" in item:
                        k, v = item.strip().split("=", 1)
                        cookies[k] = v
                token = cookies.get("access_token")

        # 3. Resolve user
        if token:
            scope["user"] = await get_user_from_jwt(token)
        else:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Helper to wrap an ASGI application with JWTAuthMiddleware."""
    return JWTAuthMiddleware(inner)
