from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.courses.models import Course, CourseLink


class UserCoursesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == "teacher":
            courses = Course.objects.filter(course_instructors__instructor=user)
        elif user.role == "student":
            courses = Course.objects.filter(enrollments__student=user)
        elif user.is_staff or user.role == "admin":
            if getattr(user, "is_superuser", False):
                courses = Course.objects.all()
            elif getattr(user, "institution", None):
                # Scoped admin: only courses within their institution (Flaw #10 fix)
                courses = Course.objects.filter(institution=user.institution)
            else:
                courses = Course.objects.none()
        else:
            courses = Course.objects.none()

        # Build a set of all linked course IDs for a fast lookup
        all_links = CourseLink.objects.filter(
            Q(source_course__in=courses) | Q(target_course__in=courses)
        ).select_related("source_course", "target_course")

        # Map course_id → list of linked course stubs
        linked_map: dict[int, list] = {}
        for link in all_links:
            src_id  = link.source_course_id
            tgt_id  = link.target_course_id
            src_stub = {"id": link.source_course.id, "name": link.source_course.name}
            tgt_stub = {"id": link.target_course.id, "name": link.target_course.name}
            linked_map.setdefault(src_id, []).append(tgt_stub)
            linked_map.setdefault(tgt_id, []).append(src_stub)

        data = []
        for c in courses:
            data.append({
                "id": c.id,
                "name": c.name,
                "institution": c.institution.name,
                "department": c.department.name if c.department else None,
                "linked_courses": linked_map.get(c.id, []),
            })
        return Response(data)
