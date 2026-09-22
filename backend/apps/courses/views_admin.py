from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminUser
from apps.courses.models import Course, Enrollment
from django.db.models import Count
from django.contrib.auth import get_user_model
from .serializers_admin import (
    CourseAdminReadSerializer,
    CourseAdminWriteSerializer,
    EnrollmentAdminSerializer,
)
from shared.admin_scoping import scope_for_admin

User = get_user_model()

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
        queryset = scope_for_admin(self.request.user, queryset)
        return queryset

class AdminEnrollmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = EnrollmentAdminSerializer
    
    def get_queryset(self):
        queryset = Enrollment.objects.all()
        queryset = scope_for_admin(
            self.request.user, 
            queryset,
            institution_field="course__institution",
            department_field="course__department"
        )
        return queryset

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_assign(self, request):
        course_id = request.data.get("course") or request.data.get("course_id")
        student_ids = request.data.get("student_ids")

        if not course_id:
            return Response({"error": "course is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(student_ids, list) or len(student_ids) == 0:
            return Response({"error": "student_ids must be a non-empty list of IDs."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_superuser:
            if request.user.institution and course.institution != request.user.institution:
                return Response({"error": "Permission denied: Course belongs to another institution."}, status=status.HTTP_403_FORBIDDEN)
            if request.user.department and course.department != request.user.department:
                return Response({"error": "Permission denied: Course belongs to another department."}, status=status.HTTP_403_FORBIDDEN)

        students_qs = User.objects.filter(id__in=student_ids, role="student")
        if not request.user.is_superuser and request.user.institution:
            students_qs = students_qs.filter(institution=request.user.institution)

        valid_students = list(students_qs)
        if not valid_students:
            return Response({"error": "No valid eligible students found for this assignment."}, status=status.HTTP_400_BAD_REQUEST)

        valid_student_ids = [s.id for s in valid_students]
        already_enrolled_ids = set(
            Enrollment.objects.filter(course=course, student_id__in=valid_student_ids).values_list("student_id", flat=True)
        )

        to_create = [
            Enrollment(course=course, student=student)
            for student in valid_students
            if student.id not in already_enrolled_ids
        ]

        if to_create:
            Enrollment.objects.bulk_create(to_create)

        return Response({
            "success": True,
            "enrolled_count": len(to_create),
            "already_enrolled_count": len(already_enrolled_ids),
            "total_requested": len(student_ids),
            "course_id": course.id,
            "course_name": course.name,
            "message": f"Successfully assigned {len(to_create)} student(s) to {course.name}. ({len(already_enrolled_ids)} already assigned)."
        }, status=status.HTTP_201_CREATED if to_create else status.HTTP_200_OK)
