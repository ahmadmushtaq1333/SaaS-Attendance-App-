from django.conf import settings
from django.core.cache import cache
from functools import wraps
from django.http import JsonResponse

def simple_ratelimit(rate='5/m', key='ip'):
    """
    Simple IP-based rate limiter using Django cache.
    rate format: 'N/m' (per minute) or 'N/h' (per hour)
    Automatically disabled during test runs (TESTING=True in settings).
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Skip rate limiting entirely during automated tests
            if getattr(settings, 'TESTING', False):
                return func(self, request, *args, **kwargs)

            parts = rate.split('/')
            limit = int(parts[0])
            period = 60 if parts[1].startswith('m') else 3600

            ip = (
                request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
                or request.META.get('REMOTE_ADDR', 'unknown')
            )
            cache_key = f"ratelimit:{func.__qualname__}:{ip}"
            count = cache.get(cache_key, 0)
            if count >= limit:
                return JsonResponse(
                    {'error': 'Too many requests. Please try again later.'},
                    status=429
                )
            # Increment counter; set expiry only on first hit
            if count == 0:
                cache.set(cache_key, 1, timeout=period)
            else:
                cache.set(cache_key, count + 1, timeout=period)
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator
