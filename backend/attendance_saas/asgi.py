"""
ASGI config for attendance_saas project.

Exposes ASGI application callable as a module-level variable named ``application``.
Supports both standard HTTP requests and asynchronous WebSockets via Django Channels.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "attendance_saas.settings.dev")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from apps.attendance.routing import websocket_urlpatterns
from apps.attendance.middleware import JWTAuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
