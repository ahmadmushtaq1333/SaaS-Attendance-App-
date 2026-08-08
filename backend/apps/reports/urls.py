from django.urls import path
from .views import CourseReportView, StudentAttendanceReportView, StudentCourseDetailView

urlpatterns = [
    path("course/<int:pk>/", CourseReportView.as_view(), name="course_report"),
    path("student/", StudentAttendanceReportView.as_view(), name="student_attendance_summary"),
    path("student/course/<int:pk>/", StudentCourseDetailView.as_view(), name="student_course_detail"),
]
