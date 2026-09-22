from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    AdminSessionViewSet,
    AdminSessionResetView
)

router = DefaultRouter()
router.register("sessions", AdminSessionViewSet, basename="admin-sessions")

urlpatterns = [
    path("", include(router.urls)),
    path("sessions/reset/", AdminSessionResetView.as_view(), name="admin-session-reset"),
]
