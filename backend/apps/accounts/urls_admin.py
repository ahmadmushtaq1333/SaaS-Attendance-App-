from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    AdminInstitutionViewSet,
    AdminUserViewSet,
    AdminCourseViewSet,
    AdminEnrollmentViewSet,
    AdminSessionResetView,
    AdminSessionViewSet
)

router = DefaultRouter()
router.register("institutions", AdminInstitutionViewSet, basename="admin-institutions")
router.register("users", AdminUserViewSet, basename="admin-users")
router.register("courses", AdminCourseViewSet, basename="admin-courses")
router.register("enrollments", AdminEnrollmentViewSet, basename="admin-enrollments")
router.register("sessions", AdminSessionViewSet, basename="admin-sessions")

urlpatterns = [
    path("", include(router.urls)),
    path("sessions/reset/", AdminSessionResetView.as_view(), name="admin-session-reset"),
]
