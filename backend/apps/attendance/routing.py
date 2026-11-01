from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/sessions/(?P<session_id>\d+)/?$", consumers.AttendanceSessionConsumer.as_asgi()),
]
