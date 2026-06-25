from django.urls import path
from .views_marking import MarkAttendanceView, SyncAttendanceView
from .views_override import AttendanceOverrideView

urlpatterns = [
    path("mark/", MarkAttendanceView.as_view(), name="attendance_mark"),
    path("sync/", SyncAttendanceView.as_view(), name="attendance_sync"),
    path("override/", AttendanceOverrideView.as_view(), name="attendance_override"),
]
