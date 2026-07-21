from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession, AttendanceRecord


class CourseReportView(APIView):
    """
    Returns attendance report for a course.
    Accessible by:
      - The teacher assigned to the course
      - Any admin / staff user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user

        # Admins can see any course; teachers only see their own
        if user.is_staff or user.role == "admin":
            try:
                course = Course.objects.get(id=pk)
            except Course.DoesNotExist:
                return Response(
                    {"error": "Course not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif user.role == "teacher":
            try:
                course = Course.objects.get(
                    id=pk,
                    course_instructors__instructor=user
                )
            except Course.DoesNotExist:
                return Response(
                    {"error": "Course not found or you do not have access to it"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {"error": "You do not have permission to view this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Sessions for this course
        sessions = AttendanceSession.objects.filter(
            course=course
        ).order_by("start_time")
        total_sessions = sessions.count()
        session_list = [
            {"id": s.id, "start_time": s.start_time}
            for s in sessions
        ]

        # All enrollments for this course
        enrollments = Enrollment.objects.filter(
            course=course
        ).select_related("student")

        # Fetch all attendance records at once for O(n) performance
        records = AttendanceRecord.objects.filter(
            session__course=course
        ).values_list("enrollment_id", "session_id")

        attendance_set = set(records)

        students_report = []
        defaulters_list = []

        for enrollment in enrollments:
            student = enrollment.student

            student_sessions = {}
            attended_count = 0
            for session in sessions:
                is_present = (enrollment.id, session.id) in attendance_set
                student_sessions[str(session.id)] = is_present   # str key for JSON safety
                if is_present:
                    attended_count += 1

            attendance_percentage = 0.0
            if total_sessions > 0:
                attendance_percentage = round(
                    (attended_count / total_sessions) * 100.0, 2
                )

            student_data = {
                "id": student.id,
                "email": student.email,
                "attended_count": attended_count,
                "attendance_percentage": attendance_percentage,
                "sessions": student_sessions,
            }

            students_report.append(student_data)

            if attendance_percentage < 75.0:
                defaulters_list.append(student_data)

        return Response({
            "course_name": course.name,
            "total_sessions": total_sessions,
            "session_list": session_list,
            "students": students_report,
            "defaulters_list": defaulters_list,
        })
