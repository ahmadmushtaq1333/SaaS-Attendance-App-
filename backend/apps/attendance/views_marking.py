from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsStudent
from apps.courses.models import Enrollment
from .models import QRToken, AttendanceRecord
from .serializers import AttendanceRecordSerializer
from django.utils import timezone
from datetime import timedelta
from dateutil import parser as date_parser
from django.core.exceptions import ValidationError

# Grace window (seconds) to absorb network latency around QR rotation.
# A token scanned within its final QR_GRACE_SECONDS is still accepted.
QR_GRACE_SECONDS = 5


class MarkAttendanceView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        token_uuid = request.data.get("token_uuid")
        if not token_uuid:
            return Response({"error": "token_uuid is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = QRToken.objects.select_related("session__course").get(token_uuid=token_uuid)
        except (QRToken.DoesNotExist, ValueError, ValidationError):
            return Response({"error": "Invalid QR code token"}, status=status.HTTP_400_BAD_REQUEST)

        # Expiry check with grace period for the rotating token.
        # The session itself never gets a grace period — it must be truly active.
        now = timezone.now()
        grace_deadline = token.expiry_time + timedelta(seconds=QR_GRACE_SECONDS)
        if grace_deadline < now:
            return Response({"error": "QR code expired — please scan the latest code."}, status=status.HTTP_400_BAD_REQUEST)
        if token.session.expiry_time < now:
            return Response({"error": "This attendance session has ended."}, status=status.HTTP_400_BAD_REQUEST)

        session = token.session
        course = session.course

        # Enrollment check
        try:
            enrollment = Enrollment.objects.get(student=request.user, course=course)
        except Enrollment.DoesNotExist:
            return Response({"error": "You are not enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)

        # Duplicate check — return 200 with already_recorded flag and explicit warning message
        if AttendanceRecord.objects.filter(enrollment=enrollment, session=session).exists():
            return Response(
                {
                    "already_recorded": True,
                    "message": "You have already marked attendance for this session. Duplicate scans are not allowed.",
                },
                status=status.HTTP_200_OK,
            )

        # Create record
        record = AttendanceRecord.objects.create(
            enrollment=enrollment,
            session=session,
            timestamp=now,
            sync_status="synced",
        )

        # Feature 8.1: Broadcast live attendance event via WebSocket
        try:
            from .services.websocket_service import broadcast_attendance_marked
            present_count = AttendanceRecord.objects.filter(session=session).count()
            total_enrolled = Enrollment.objects.filter(course=course).count()
            broadcast_attendance_marked(session.id, request.user, record, present_count, total_enrolled)
        except Exception:
            pass

        serializer = AttendanceRecordSerializer(record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SyncAttendanceView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        # Expecting a list of records: [{"token_uuid": "...", "timestamp": "..."}]
        records = request.data.get("records")
        if not isinstance(records, list):
            return Response({"error": "records must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        
        success_count = 0
        skipped_count = 0
        errors = []

        for index, item in enumerate(records):
            token_uuid = item.get("token_uuid")
            timestamp_str = item.get("timestamp")
            
            if not token_uuid or not timestamp_str:
                errors.append({"index": index, "error": "token_uuid and timestamp are required"})
                continue
            
            try:
                timestamp = date_parser.parse(timestamp_str)
                if timezone.is_naive(timestamp):
                    timestamp = timezone.make_aware(timestamp)
            except Exception:
                errors.append({"index": index, "error": f"Invalid timestamp format: {timestamp_str}"})
                continue
            
            try:
                token = QRToken.objects.select_related("session__course").get(token_uuid=token_uuid)
            except (QRToken.DoesNotExist, ValueError, ValidationError):
                errors.append({"index": index, "token_uuid": token_uuid, "error": "Invalid QR code token"})
                continue
            
            session = token.session
            
            # Check Enrollment
            try:
                enrollment = Enrollment.objects.get(student=request.user, course=session.course)
            except Enrollment.DoesNotExist:
                errors.append({"index": index, "token_uuid": token_uuid, "error": "Student not enrolled"})
                continue

            # A7-S1 & A7-S2: Decouple token rotation from session acceptance window.
            # The rotating token_uuid proves physical presence at scan time.
            # For offline sync validation, verify that the scan timestamp fell within
            # the active attendance session duration (with a 60s clock skew / grace window).
            session_grace = session.expiry_time + timedelta(seconds=60)
            if timestamp > session_grace:
                errors.append({"index": index, "token_uuid": token_uuid, "error": "Attendance session had ended at the time of scan"})
                continue

            # Allow 60s skew before session.start_time for mobile clocks that may be slightly behind
            if timestamp < (session.start_time - timedelta(seconds=60)):
                errors.append({"index": index, "token_uuid": token_uuid, "error": "Scan timestamp is prior to session start time"})
                continue
            
            # Check Duplicate
            exists = AttendanceRecord.objects.filter(enrollment=enrollment, session=session).exists()
            if exists:
                skipped_count += 1
                continue
            
            # Create synced record
            AttendanceRecord.objects.create(
                enrollment=enrollment,
                session=session,
                timestamp=timestamp,
                sync_status="synced"
            )
            success_count += 1

        return Response({
            "success_count": success_count,
            "skipped_count": skipped_count,
            "errors": errors
        }, status=status.HTTP_200_OK)
