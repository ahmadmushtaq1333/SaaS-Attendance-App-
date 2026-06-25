from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/sessions/", include("apps.attendance.urls_sessions")),
    path("api/attendance/", include("apps.attendance.urls_marking")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/admin/", include("apps.accounts.urls_admin")),
]
