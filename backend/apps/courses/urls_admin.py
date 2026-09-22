from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    AdminCourseViewSet,
    AdminEnrollmentViewSet
)

router = DefaultRouter()
router.register("courses", AdminCourseViewSet, basename="admin-courses")
router.register("enrollments", AdminEnrollmentViewSet, basename="admin-enrollments")

urlpatterns = [
    path("", include(router.urls)),
]
