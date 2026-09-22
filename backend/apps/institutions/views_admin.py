from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminUser, IsGlobalAdmin
from apps.institutions.models import Institution, Department, Semester, Section
from django.db.models import Count
from .serializers_admin import (
    InstitutionAdminSerializer,
    DepartmentAdminSerializer,
    SemesterAdminSerializer,
    SectionAdminSerializer
)
from shared.admin_scoping import scope_for_admin

class AdminInstitutionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = InstitutionAdminSerializer

    def get_permissions(self):
        # Only Global Super Admins can create, edit, or delete institutions
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsGlobalAdmin()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        qs = Institution.objects.all().annotate(
            user_count=Count("users", distinct=True),
            course_count=Count("courses", distinct=True)
        )
        # Institution-specific admins are scoped to their assigned institution
        if not self.request.user.is_superuser and self.request.user.institution:
            qs = qs.filter(id=self.request.user.institution.id)
        return qs

class AdminDepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DepartmentAdminSerializer
    
    def get_queryset(self):
        queryset = Department.objects.all()
        queryset = scope_for_admin(self.request.user, queryset)
        
        inst_id = self.request.query_params.get("institution")
        if inst_id:
            queryset = queryset.filter(institution_id=inst_id)
        return queryset

class AdminSemesterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SemesterAdminSerializer
    
    def get_queryset(self):
        queryset = Semester.objects.all()
        queryset = scope_for_admin(
            self.request.user, 
            queryset,
            institution_field="department__institution",
            department_field="department"
        )
        
        dept_id = self.request.query_params.get("department")
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        return queryset

class AdminSectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SectionAdminSerializer
    
    def get_queryset(self):
        queryset = Section.objects.all()
        queryset = scope_for_admin(
            self.request.user, 
            queryset,
            institution_field="semester__department__institution",
            department_field="semester__department"
        )
        
        sem_id = self.request.query_params.get("semester")
        if sem_id:
            queryset = queryset.filter(semester_id=sem_id)
        return queryset
