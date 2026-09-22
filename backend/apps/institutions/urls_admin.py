from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    AdminInstitutionViewSet,
    AdminDepartmentViewSet,
    AdminSemesterViewSet,
    AdminSectionViewSet
)

router = DefaultRouter()
router.register("institutions", AdminInstitutionViewSet, basename="admin-institutions")
router.register("departments", AdminDepartmentViewSet, basename="admin-departments")
router.register("semesters", AdminSemesterViewSet, basename="admin-semesters")
router.register("sections", AdminSectionViewSet, basename="admin-sections")

urlpatterns = [
    path("", include(router.urls)),
]
