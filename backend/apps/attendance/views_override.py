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
        student_id = request.data.get("student_id")
        session_id = request.data.get("session_id")
        action = request.data.get("action")  # "present" or "absent"

        if not student_id or not session_id or not action:
            return Response({"error": "student_id, session_id, and action are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = AttendanceSession.objects.get(id=session_id)
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        # Security check: Ensure the teacher teaches this course
        if session.course.teacher != request.user:
            return Response({"error": "You do not have permission to manage this session's course"}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response({"error": "Student account not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "present":
            # Mark the student present (create or update record)
            record, created = AttendanceRecord.objects.get_or_create(
                student=student,
                session=session,
                defaults={
                    "timestamp": timezone.now(),
                    "sync_status": "synced"
                }
            )
            return Response({"message": f"Successfully marked student {student.email} as present.", "created": created})
        
        elif action == "absent":
            # Remove attendance record to mark them absent
            deleted_count, _ = AttendanceRecord.objects.filter(student=student, session=session).delete()
            return Response({"message": f"Successfully marked student {student.email} as absent.", "deleted": deleted_count > 0})

        else:
            return Response({"error": "Invalid action choice"}, status=status.HTTP_400_BAD_REQUEST)
