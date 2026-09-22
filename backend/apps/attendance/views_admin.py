from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.accounts.permissions import IsAdminUser
from apps.attendance.models import AttendanceSession
from django_filters.rest_framework import DjangoFilterBackend
from .serializers_admin import SessionAdminSerializer
from shared.admin_scoping import scope_for_admin

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
            # Clean up all attendance records associated with this session to fully reset it
            deleted_count, _ = session.records.all().delete()
            return Response({"message": f"Session {session_id} has been reset successfully. All {deleted_count} marked records have been cleared."})
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

class AdminSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SessionAdminSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course"]

    def get_queryset(self):
        queryset = AttendanceSession.objects.all().order_by("-start_time")
        queryset = scope_for_admin(
            self.request.user, 
            queryset,
            institution_field="course__institution",
            department_field="course__department"
        )
        return queryset
