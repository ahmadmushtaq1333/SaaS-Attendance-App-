from rest_framework import serializers
from apps.attendance.models import AttendanceSession

class SessionAdminSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    session_number = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ("id", "course", "course_name", "session_number", "start_time", "expiry_time")
        read_only_fields = ("id", "course_name", "session_number", "start_time")

    def get_session_number(self, obj):
        return AttendanceSession.objects.filter(
            course=obj.course,
            start_time__lte=obj.start_time
        ).count()
