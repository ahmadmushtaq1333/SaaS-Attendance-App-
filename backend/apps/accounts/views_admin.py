from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminUser
from apps.institutions.models import Institution
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from .serializers_admin import (
    InstitutionAdminSerializer,
    UserAdminSerializer,
    CourseAdminSerializer,
    EnrollmentAdminSerializer,
    SessionAdminSerializer
)

User = get_user_model()

class AdminInstitutionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = InstitutionAdminSerializer

    def get_queryset(self):
        return Institution.objects.all().annotate(
            user_count=Count("users", distinct=True),
            course_count=Count("courses", distinct=True)
        )

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all()

class AdminCourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = CourseAdminSerializer

    def get_queryset(self):
        return Course.objects.all().annotate(
            enrollment_count=Count("enrollments", distinct=True)
        )

class AdminEnrollmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = EnrollmentAdminSerializer
    queryset = Enrollment.objects.all()

class AdminSessionResetView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            return Response({"error": "session_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session = AttendanceSession.objects.get(id=session_id)
            # Terminate session immediately by setting expiry time to now
            session.expiry_time = timezone.now()
            session.save()
            
            # Invalidate all active tokens mapped to this session
            session.qr_tokens.all().update(expiry_time=timezone.now())
            
            return Response({"message": f"Session {session_id} has been reset and expired successfully."})
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

class AdminSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SessionAdminSerializer
    queryset = AttendanceSession.objects.all().order_by("-start_time")
