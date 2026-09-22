from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.utils import timezone
from .models import CustomUser, EmailVerificationCode, DeviceBinding, DailyDeviceLock
from shared.ratelimit import simple_ratelimit
from .views_otp import generate_and_send_otp

class ResetDeviceBindingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role != "admin" and not getattr(request.user, "is_superuser", False):
            return Response(
                {"error": "Unauthorized: Device binding can only be reset by an administrator."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            student = CustomUser.objects.get(id=user_id, role="student")
            DeviceBinding.objects.filter(user=student).delete()
            return Response({"message": f"Device binding reset successfully for {student.email}."})
        except CustomUser.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)


class ResetDailyDeviceLockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role != "admin" and not getattr(request.user, "is_superuser", False):
            return Response(
                {"error": "Unauthorized: Daily device lock can only be reset by an administrator."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            student = CustomUser.objects.get(id=user_id, role="student")
            today = timezone.now().date()
            DailyDeviceLock.objects.filter(user=student, date=today).delete()
            return Response({"message": f"Daily device lock reset successfully for {student.email}."})
        except CustomUser.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)


class RequestDeviceRebindView(APIView):
    permission_classes = [AllowAny]

    @simple_ratelimit(rate='5/m')
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower(), role="student")
            if DeviceBinding.objects.filter(user=user).exists():
                success, err_msg = generate_and_send_otp(user, purpose="rebind")
                if not success:
                    return Response({"error": f"SMTP email delivery failed: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except CustomUser.DoesNotExist:
            pass
            
        return Response({"message": "If the account exists and is bound, a verification code has been sent."})


class ConfirmDeviceRebindView(APIView):
    permission_classes = [AllowAny]

    @simple_ratelimit(rate='10/m')
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        if not email or not code:
            return Response({"error": "Email and code are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower(), role="student")
        except CustomUser.DoesNotExist:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            record = EmailVerificationCode.objects.get(user=user, purpose="rebind")
            if record.failed_attempts >= 5:
                return Response({"error": "Too many failed attempts. Request a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if record.expires_at < timezone.now():
                return Response({"error": "Code has expired"}, status=status.HTTP_400_BAD_REQUEST)
            if record.code != code.strip():
                record.failed_attempts += 1
                record.save()
                return Response({"error": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)
                
            DeviceBinding.objects.filter(user=user).delete()
            record.delete()
            return Response({"message": "Device binding reset successfully. You can now log in."})
        except EmailVerificationCode.DoesNotExist:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
