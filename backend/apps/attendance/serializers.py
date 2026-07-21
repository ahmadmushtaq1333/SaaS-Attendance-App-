from rest_framework import serializers
from .models import AttendanceSession, QRToken, AttendanceRecord
from apps.courses.models import Course
import qrcode
import io
import base64
from django.utils import timezone
from datetime import timedelta

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "institution")

class AttendanceSessionSerializer(serializers.ModelSerializer):
    qr_code = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ("id", "course", "start_time", "expiry_time", "qr_code")
        read_only_fields = ("id", "start_time", "expiry_time", "qr_code")

    def get_qr_code(self, obj):
        # We find the latest active QR token or create one
        token = obj.qr_tokens.filter(expiry_time__gt=timezone.now()).first()
        if not token:
            token = QRToken.objects.create(
                session=obj,
                expiry_time=timezone.now() + timedelta(seconds=10)
            )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(str(token.token_uuid))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = ("id", "enrollment", "session", "timestamp", "sync_status")
        read_only_fields = ("id", "enrollment")
