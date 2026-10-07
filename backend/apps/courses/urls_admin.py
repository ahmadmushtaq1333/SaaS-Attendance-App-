from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    AdminCourseViewSet,
    AdminEnrollmentViewSet,
    AdminCourseLinkViewSet
)

router = DefaultRouter()
router.register("courses", AdminCourseViewSet, basename="admin-courses")
router.register("enrollments", AdminEnrollmentViewSet, basename="admin-enrollments")
router.register("course-links", AdminCourseLinkViewSet, basename="admin-courselinks")

urlpatterns = [
    path("", include(router.urls)),
]
