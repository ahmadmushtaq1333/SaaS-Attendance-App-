from rest_framework import serializers
from .models import AttendanceSession, QRToken, AttendanceRecord
from apps.courses.models import Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "institution")

class AttendanceSessionSerializer(serializers.ModelSerializer):
    qr_code = serializers.SerializerMethodField()
    session_number = serializers.SerializerMethodField()
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = ("id", "course", "course_name", "session_number", "start_time", "expiry_time", "qr_code")
        read_only_fields = ("id", "course_name", "session_number", "start_time", "expiry_time", "qr_code")

    def get_session_number(self, obj):
        return AttendanceSession.objects.filter(
            course=obj.course,
            start_time__lte=obj.start_time
        ).count()

    def get_qr_code(self, obj):
        from .qr_service import get_session_qr_code
        return get_session_qr_code(obj)

class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = ("id", "enrollment", "session", "timestamp", "sync_status")
        read_only_fields = ("id", "enrollment")
