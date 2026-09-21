from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsTeacher
from apps.attendance.models import AttendanceSession, AttendanceRecord
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class AttendanceOverrideView(views.APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        single_id = request.data.get("student_id")
        multiple_ids = request.data.get("student_ids")
        session_id = request.data.get("session_id")
        action = request.data.get("action")  # "present" or "absent"

        if not (single_id or multiple_ids) or not session_id or not action:
            return Response({"error": "student_id (or student_ids list), session_id, and action are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = AttendanceSession.objects.get(id=session_id)
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        # Security check: Ensure the teacher teaches this course
        if not session.course.course_instructors.filter(instructor=request.user).exists():
            return Response({"error": "You do not have permission to manage this session's course"}, status=status.HTTP_403_FORBIDDEN)

        student_ids = multiple_ids if multiple_ids else [single_id]
        if not isinstance(student_ids, list):
            return Response({"error": "student_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        from apps.courses.models import Enrollment
        results = {"success": [], "errors": []}

        for s_id in student_ids:
            try:
                student = User.objects.get(id=s_id, role="student")
            except User.DoesNotExist:
                results["errors"].append({"id": s_id, "error": "Student account not found"})
                continue

            try:
                enrollment = Enrollment.objects.get(student=student, course=session.course)
            except Enrollment.DoesNotExist:
                results["errors"].append({"id": s_id, "error": "Student is not enrolled in this course"})
                continue

            if action == "present":
                record, created = AttendanceRecord.objects.get_or_create(
                    enrollment=enrollment,
                    session=session,
                    defaults={
                        "timestamp": timezone.now(),
                        "sync_status": "synced"
                    }
                )
                results["success"].append(s_id)
            elif action == "absent":
                deleted_count, _ = AttendanceRecord.objects.filter(enrollment=enrollment, session=session).delete()
                results["success"].append(s_id)
            else:
                return Response({"error": "Invalid action choice"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": f"Processed bulk override for {len(results['success'])} students.", "details": results})
