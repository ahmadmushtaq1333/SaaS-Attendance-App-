from django.urls import path, include

urlpatterns = [
    path("", include("apps.accounts.urls_admin_users")),
    path("", include("apps.institutions.urls_admin")),
    path("", include("apps.courses.urls_admin")),
    path("", include("apps.attendance.urls_admin")),
]
