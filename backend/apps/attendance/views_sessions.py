from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsTeacher
from django.db.models import Count
from apps.courses.models import Course
from .models import AttendanceSession, QRToken
from .serializers import AttendanceSessionSerializer
from django.utils import timezone
from datetime import timedelta
import base64

class AttendanceSessionDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def delete(self, request, pk):
        try:
            session = AttendanceSession.objects.get(id=pk, course__course_instructors__instructor=request.user)
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found or permission denied"}, status=status.HTTP_404_NOT_FOUND)
        
        session.delete()
        return Response({"message": "Session deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class AttendanceSessionCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        # Allow teachers to retrieve all sessions they created with single query
        sessions = AttendanceSession.objects.filter(
            course__course_instructors__instructor=request.user
        ).select_related("course").annotate(
            present_count=Count("records", distinct=True)
        ).order_by("-start_time")
        serializer = AttendanceSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        course_id = request.data.get("course_id")
        duration_minutes = request.data.get("duration_minutes", 60)
        try:
            duration_minutes = int(duration_minutes)
        except (ValueError, TypeError):
            duration_minutes = 60

        if not course_id:
            return Response({"error": "course_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            course = Course.objects.get(id=course_id, course_instructors__instructor=request.user)
        except Course.DoesNotExist:
            return Response({"error": "Course not found or you are not the teacher"}, status=status.HTTP_404_NOT_FOUND)
        
        now = timezone.now()
        session = AttendanceSession.objects.create(
            course=course,
            expiry_time=now + timedelta(minutes=duration_minutes)
        )
        
        # Pre-create first token with 10-second rotation
        QRToken.objects.create(
            session=session,
            expiry_time=now + timedelta(seconds=10)
        )
        
        serializer = AttendanceSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AttendanceSessionQRView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, pk):
        try:
            session = AttendanceSession.objects.select_related("course").get(
                id=pk, course__course_instructors__instructor=request.user
            )
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        
        now = timezone.now()
        if session.expiry_time and session.expiry_time <= now:
            return Response({
                "id": session.id,
                "qr_code": None,
                "token_expires_at": None,
                "session_expired": True,
                "expiry_time": session.expiry_time.isoformat(),
            })

        from .qr_service import get_session_qr_code_with_ttl
        qr_code, token_expires_at = get_session_qr_code_with_ttl(session)
        return Response({
            "id": session.id,
            "qr_code": qr_code,
            "token_expires_at": token_expires_at.isoformat(),
            "session_expired": False,
            "expiry_time": session.expiry_time.isoformat() if session.expiry_time else None,
        })

class AttendanceSessionStopView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, pk):
        try:
            session = AttendanceSession.objects.get(id=pk, course__course_instructors__instructor=request.user)
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Expire session instantly
        session.expiry_time = timezone.now()
        session.save()
        
        # Invalidate active QR tokens
        session.qr_tokens.all().update(expiry_time=timezone.now())
        
        return Response({"message": "Session terminated successfully."})
