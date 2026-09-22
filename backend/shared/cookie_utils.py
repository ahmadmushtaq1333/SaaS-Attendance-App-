def get_cookie_policy(request) -> tuple[bool, str]:
    """Returns (is_secure, samesite_policy) for cookie settings."""
    from django.conf import settings
    is_secure = request.is_secure() or (not settings.DEBUG)
    samesite_policy = 'None' if is_secure else 'Lax'
    return is_secure, samesite_policy
