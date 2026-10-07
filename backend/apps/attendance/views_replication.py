"""Thin view — all business logic lives in AttendanceReplicationService."""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsTeacher
from apps.attendance.services.replication_service import (
    AttendanceReplicationService,
    ReplicationError,
)


class ReplicateAttendanceView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        source_session_id = request.data.get("source_session_id")
        target_course_id  = request.data.get("target_course_id")
        conflict_strategy = request.data.get("conflict_strategy", "replace")

        if not source_session_id or not target_course_id:
            return Response(
                {"error": "source_session_id and target_course_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = AttendanceReplicationService.replicate(
                source_session_id=int(source_session_id),
                target_course_id=int(target_course_id),
                requesting_teacher=request.user,
                conflict_strategy=conflict_strategy,
            )
            http_status = (
                status.HTTP_200_OK
                if result.get("status") == "skipped"
                else status.HTTP_201_CREATED
            )
            return Response(result, status=http_status)

        except ReplicationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response(
                {"error": "source_session_id and target_course_id must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"error": "An unexpected error occurred. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
