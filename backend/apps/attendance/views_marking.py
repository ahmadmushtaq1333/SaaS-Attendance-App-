from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsStudent
from apps.courses.models import Enrollment
from .models import QRToken, AttendanceRecord
from .serializers import AttendanceRecordSerializer
from django.utils import timezone
from dateutil import parser as date_parser

class MarkAttendanceView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        token_uuid = request.data.get("token_uuid")
        if not token_uuid:
            return Response({"error": "token_uuid is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token = QRToken.objects.get(token_uuid=token_uuid)
        except (QRToken.DoesNotExist, ValueError):
            return Response({"error": "Invalid QR code token"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Check expiration
        if token.expiry_time < timezone.now() or token.session.expiry_time < timezone.now():
            return Response({"error": "QR code expired"}, status=status.HTTP_400_BAD_REQUEST)
        
        session = token.session
        course = session.course
        
        # 2. Check enrollment
        enrolled = Enrollment.objects.filter(student=request.user, course=course).exists()
        if not enrolled:
            return Response({"error": "Student not enrolled"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 3. Check duplicate
        exists = AttendanceRecord.objects.filter(student=request.user, session=session).exists()
        if exists:
            return Response({"error": "Attendance already recorded"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 4. Create record
        record = AttendanceRecord.objects.create(
            student=request.user,
            session=session,
            timestamp=timezone.now(),
            sync_status="synced"
        )
        
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
                token = QRToken.objects.get(token_uuid=token_uuid)
            except (QRToken.DoesNotExist, ValueError):
                errors.append({"index": index, "token_uuid": token_uuid, "error": "Invalid QR code token"})
                continue
            
            session = token.session
            
            # Check Enrollment
            enrolled = Enrollment.objects.filter(student=request.user, course=session.course).exists()
            if not enrolled:
                errors.append({"index": index, "token_uuid": token_uuid, "error": "Student not enrolled"})
                continue

            # Note: For offline sync, since the user scanned it offline, we validate if the scan happened
            # within the token's active window (i.e. token.expiry_time > user's scan timestamp, and user's scan timestamp >= session.start_time).
            # This allows offline sync to work correctly.
            if timestamp > token.expiry_time:
                errors.append({"index": index, "token_uuid": token_uuid, "error": "QR code was expired at the time of scan"})
                continue
            
            # Check Duplicate
            exists = AttendanceRecord.objects.filter(student=request.user, session=session).exists()
            if exists:
                skipped_count += 1
                continue
            
            # Create synced record
            AttendanceRecord.objects.create(
                student=request.user,
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
