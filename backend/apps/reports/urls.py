from django.urls import path
from .views import CourseReportView, StudentAttendanceReportView, StudentCourseDetailView, BulkNotifyTierView, NotifyStudentView

urlpatterns = [
    path("course/<int:pk>/", CourseReportView.as_view(), name="course_report"),
    path("notify-tier/", BulkNotifyTierView.as_view(), name="bulk_notify_tier"),
    path("notify-student/", NotifyStudentView.as_view(), name="notify_student"),
    path("student/", StudentAttendanceReportView.as_view(), name="student_attendance_summary"),
    path("student/course/<int:pk>/", StudentCourseDetailView.as_view(), name="student_course_detail"),
]
