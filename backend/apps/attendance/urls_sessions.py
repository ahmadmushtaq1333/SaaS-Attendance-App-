from django.urls import path
from .views_sessions import AttendanceSessionCreateView, AttendanceSessionQRView, AttendanceSessionStopView

urlpatterns = [
    path("", AttendanceSessionCreateView.as_view(), name="session_create"),
    path("<int:pk>/qr/", AttendanceSessionQRView.as_view(), name="session_qr"),
    path("<int:pk>/stop/", AttendanceSessionStopView.as_view(), name="session_stop"),
]
