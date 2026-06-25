from django.urls import path
from .views import CourseReportView

urlpatterns = [
    path("course/<int:pk>/", CourseReportView.as_view(), name="course_report"),
]
