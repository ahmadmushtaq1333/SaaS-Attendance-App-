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

        # Flat 403 for students - prevents course-existence enumeration via 404 vs 403 distinction
        if user.role == "student":
            return Response(
                {"error": "You do not have permission to view this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Immediate role verification to prevent unauthorized resource enumeration
        if user.role not in ["admin", "teacher"] and not user.is_staff:
            return Response(
                {"error": "You do not have permission to view this report"},
                status=status.HTTP_403_FORBIDDEN
            )

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
            {"id": s.id, "session_number": i + 1, "start_time": s.start_time}
            for i, s in enumerate(sessions)
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


class StudentAttendanceReportView(APIView):
    """
    Student self-attendance report.
    GET /api/reports/student/           -> summary for all enrolled courses
    GET /api/reports/student/course/<pk>/ -> session-by-session detail for one course
    """
    permission_classes = [IsAuthenticated]

    def _require_student(self, request):
        if request.user.role != "student":
            return Response(
                {"error": "This endpoint is for students only."},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def get(self, request):
        err = self._require_student(request)
        if err:
            return err

        student = request.user
        enrollments = Enrollment.objects.filter(student=student).select_related("course", "course__institution")

        summary = []
        for enrollment in enrollments:
            course = enrollment.course
            sessions = AttendanceSession.objects.filter(course=course).order_by("start_time")
            total_sessions = sessions.count()

            attended_count = AttendanceRecord.objects.filter(
                enrollment=enrollment
            ).count()

            attendance_percentage = 0.0
            if total_sessions > 0:
                attendance_percentage = round((attended_count / total_sessions) * 100.0, 2)

            summary.append({
                "course_id": course.id,
                "course_name": course.name,
                "institution_name": course.institution.name if course.institution else None,
                "total_sessions": total_sessions,
                "attended_count": attended_count,
                "attendance_percentage": attendance_percentage,
                "is_at_risk": attendance_percentage < 75.0 and total_sessions > 0,
            })

        return Response({"courses": summary})


class StudentCourseDetailView(APIView):
    """
    Session-by-session attendance detail for a student's specific course.
    GET /api/reports/student/course/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        student = request.user
        if student.role != "student":
            return Response(
                {"error": "This endpoint is for students only."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            enrollment = Enrollment.objects.select_related("course", "course__institution").get(
                student=student, course_id=pk
            )
        except Enrollment.DoesNotExist:
            return Response(
                {"error": "You are not enrolled in this course."},
                status=status.HTTP_404_NOT_FOUND
            )

        course = enrollment.course
        sessions = AttendanceSession.objects.filter(course=course).order_by("start_time")

        # Fetch this student's records in one query
        attended_session_ids = set(
            AttendanceRecord.objects.filter(enrollment=enrollment).values_list("session_id", flat=True)
        )

        session_log = []
        for i, s in enumerate(sessions):
            session_log.append({
                "session_id": s.id,
                "session_number": i + 1,
                "date": s.start_time.strftime("%Y-%m-%d"),
                "time": s.start_time.strftime("%H:%M"),
                "present": s.id in attended_session_ids,
            })

        total_sessions = sessions.count()
        attended_count = len(attended_session_ids)
        attendance_percentage = round((attended_count / total_sessions) * 100.0, 2) if total_sessions > 0 else 0.0

        return Response({
            "course_id": course.id,
            "course_name": course.name,
            "institution_name": course.institution.name if course.institution else None,
            "total_sessions": total_sessions,
            "attended_count": attended_count,
            "attendance_percentage": attendance_percentage,
            "is_at_risk": attendance_percentage < 75.0 and total_sessions > 0,
            "session_log": session_log,
        })
