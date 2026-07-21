from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminUser
from apps.institutions.models import Institution, Department, Semester, Section
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework.decorators import action
from django.utils import timezone
from .serializers_admin import (
    InstitutionAdminSerializer,
    UserAdminSerializer,
    CourseAdminReadSerializer,
    CourseAdminWriteSerializer,
    EnrollmentAdminSerializer,
    SessionAdminSerializer,
    DepartmentAdminSerializer,
    SemesterAdminSerializer,
    SectionAdminSerializer
)
from django_filters.rest_framework import DjangoFilterBackend

User = get_user_model()

class AdminInstitutionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = InstitutionAdminSerializer

    def get_queryset(self):
        qs = Institution.objects.all().annotate(
            user_count=Count("users", distinct=True),
            course_count=Count("courses", distinct=True)
        )
        if not self.request.user.is_superuser and self.request.user.institution:
            qs = qs.filter(id=self.request.user.institution.id)
        return qs

class AdminDepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DepartmentAdminSerializer
    
    def get_queryset(self):
        queryset = Department.objects.all()
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(institution=self.request.user.institution)
            if self.request.user.department:
                queryset = queryset.filter(id=self.request.user.department.id)
        
        inst_id = self.request.query_params.get("institution")
        if inst_id:
            queryset = queryset.filter(institution_id=inst_id)
        return queryset

class AdminSemesterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SemesterAdminSerializer
    
    def get_queryset(self):
        queryset = Semester.objects.all()
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(department__institution=self.request.user.institution)
            if self.request.user.department:
                queryset = queryset.filter(department=self.request.user.department)
        
        dept_id = self.request.query_params.get("department")
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        return queryset

class AdminSectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SectionAdminSerializer
    
    def get_queryset(self):
        queryset = Section.objects.all()
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(semester__department__institution=self.request.user.institution)
            if self.request.user.department:
                queryset = queryset.filter(semester__department=self.request.user.department)
        
        sem_id = self.request.query_params.get("semester")
        if sem_id:
            queryset = queryset.filter(semester_id=sem_id)
        return queryset

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserAdminSerializer
    
    def get_queryset(self):
        queryset = User.objects.all()
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(
                    Q(institution=self.request.user.institution) | 
                    Q(section__semester__department__institution=self.request.user.institution) |
                    Q(department__institution=self.request.user.institution)
                )
            if self.request.user.department:
                queryset = queryset.filter(
                    Q(department=self.request.user.department) |
                    Q(section__semester__department=self.request.user.department)
                )
        
        inst_id = self.request.query_params.get("institution")
        if inst_id:
            queryset = queryset.filter(
                Q(institution_id=inst_id) | 
                Q(section__semester__department__institution_id=inst_id)
            )
        return queryset

    @action(detail=False, methods=["post"], url_path="bulk-generate")
    def bulk_generate(self, request):
        section_id = request.data.get("section_id")
        count = request.data.get("count", 1)
        prefix = request.data.get("prefix", "std_")
        course_id = request.data.get("course_id")
        custom_password = request.data.get("password")
        
        if not section_id:
            return Response({"error": "section_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            return Response({"error": "Section not found"}, status=status.HTTP_404_NOT_FOUND)
            
        course = None
        if course_id:
            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check permissions for scoped admin
        if not request.user.is_superuser:
            if request.user.institution and section.semester.department.institution != request.user.institution:
                return Response({"error": "Permission denied for this institution"}, status=status.HTTP_403_FORBIDDEN)
            if request.user.department and section.semester.department != request.user.department:
                return Response({"error": "Permission denied for this department"}, status=status.HTTP_403_FORBIDDEN)

        institution = section.semester.department.institution
        domain = institution.slug or "uni"
        
        created_users = []
        import string
        import random
        from django.db import transaction
        
        try:
            with transaction.atomic():
                for i in range(1, int(count) + 1):
                    attempts = 0
                    while attempts < 100:
                        suffix = f"{i:03d}" if int(count) > 1 or attempts > 0 else f"{random.randint(100, 999)}"
                        email = f"{prefix}{suffix}@{domain}.edu".lower()
                        if not User.objects.filter(email=email).exists():
                            break
                        attempts += 1
                        prefix = prefix + str(random.randint(0, 9))
                    
                    if custom_password:
                        password = custom_password
                    else:
                        password_chars = string.ascii_letters + string.digits
                        password = "".join(random.choice(password_chars) for _ in range(8))
                    
                    user = User.objects.create_user(
                        email=email,
                        password=password,
                        role="student",
                        section=section
                    )
                    
                    if course:
                        Enrollment.objects.create(
                            student=user,
                            course=course
                        )

                    created_users.append({
                        "email": email,
                        "password": password,
                        "role": "student",
                        "section_name": section.name,
                        "semester_number": section.semester.number,
                        "department_name": section.semester.department.name,
                        "enrolled_course": course.name if course else None
                    })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({"users": created_users, "message": f"Successfully generated {len(created_users)} students."}, status=status.HTTP_201_CREATED)


class AdminCourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = CourseAdminReadSerializer

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CourseAdminWriteSerializer
        return CourseAdminReadSerializer

    def get_queryset(self):
        queryset = Course.objects.all().annotate(
            enrollment_count=Count("enrollments", distinct=True)
        )
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(institution=self.request.user.institution)
            if self.request.user.department:
                queryset = queryset.filter(department=self.request.user.department)
        return queryset

class AdminEnrollmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = EnrollmentAdminSerializer
    
    def get_queryset(self):
        queryset = Enrollment.objects.all()
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(course__institution=self.request.user.institution)
            if self.request.user.department:
                queryset = queryset.filter(course__department=self.request.user.department)
        return queryset

class AdminSessionResetView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            return Response({"error": "session_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session = AttendanceSession.objects.get(id=session_id)
            if not request.user.is_superuser:
                if request.user.institution and session.course.institution != request.user.institution:
                    return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
                if request.user.department and session.course.department != request.user.department:
                    return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
            session.expiry_time = timezone.now()
            session.save()
            session.qr_tokens.all().update(expiry_time=timezone.now())
            return Response({"message": f"Session {session_id} has been reset and expired successfully."})
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

class AdminSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SessionAdminSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course"]

    def get_queryset(self):
        queryset = AttendanceSession.objects.all().order_by("-start_time")
        if not self.request.user.is_superuser:
            if self.request.user.institution:
                queryset = queryset.filter(course__institution=self.request.user.institution)
            if self.request.user.department:
                queryset = queryset.filter(course__department=self.request.user.department)
        return queryset
