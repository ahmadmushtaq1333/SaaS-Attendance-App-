from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


from apps.courses.models import Course

class UserCoursesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == "teacher":
            courses = Course.objects.filter(course_instructors__instructor=user)
        elif user.role == "student":
            courses = Course.objects.filter(enrollments__student=user)
        elif user.is_staff or user.role == "admin":
            courses = Course.objects.all()
        else:
            courses = Course.objects.none()
        
        data = []
        for c in courses:
            data.append({
                "id": c.id,
                "name": c.name,
                "institution": c.institution.name,
                "department": c.department.name if c.department else None,
            })
        return Response(data)
