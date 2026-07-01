from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminUser
from apps.institutions.models import Institution, Department, Semester, Section
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
    SessionAdminSerializer,
    DepartmentAdminSerializer,
    SemesterAdminSerializer,
    SectionAdminSerializer
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

class AdminDepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DepartmentAdminSerializer
    
    def get_queryset(self):
        queryset = Department.objects.all()
        inst_id = self.request.query_params.get("institution")
        if inst_id:
            queryset = queryset.filter(institution_id=inst_id)
        return queryset

class AdminSemesterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SemesterAdminSerializer
    
    def get_queryset(self):
        queryset = Semester.objects.all()
        dept_id = self.request.query_params.get("department")
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        return queryset

class AdminSectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SectionAdminSerializer
    
    def get_queryset(self):
        queryset = Section.objects.all()
        sem_id = self.request.query_params.get("semester")
        if sem_id:
            queryset = queryset.filter(semester_id=sem_id)
        return queryset

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserAdminSerializer
    
    def get_queryset(self):
        queryset = User.objects.all()
        inst_id = self.request.query_params.get("institution")
        if inst_id:
            queryset = queryset.filter(institution_id=inst_id)
        return queryset

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
