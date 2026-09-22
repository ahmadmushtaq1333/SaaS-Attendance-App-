from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.utils import timezone
from .models import CustomUser, EmailVerificationCode
from shared.ratelimit import simple_ratelimit
from .views_otp import generate_and_send_otp

class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

    @simple_ratelimit(rate='5/m')
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
            success, err_msg = generate_and_send_otp(user, purpose="reset")
            if not success:
                return Response({"error": f"SMTP email delivery failed: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except CustomUser.DoesNotExist:
            pass
            
        return Response({"message": "If the email exists, a password reset code has been sent."})


class ConfirmPasswordResetView(APIView):
    permission_classes = [AllowAny]

    @simple_ratelimit(rate='10/m')
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("password")
        if not email or not code or not new_password:
            return Response({"error": "Email, code, and new password are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
        except CustomUser.DoesNotExist:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            record = EmailVerificationCode.objects.get(user=user, purpose="reset")
            if record.failed_attempts >= 5:
                return Response({"error": "Too many failed attempts. Request a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if record.expires_at < timezone.now():
                return Response({"error": "Code has expired"}, status=status.HTTP_400_BAD_REQUEST)
            if record.code != code.strip():
                record.failed_attempts += 1
                record.save()
                return Response({"error": "Invalid password reset code"}, status=status.HTTP_400_BAD_REQUEST)
                
            user.set_password(new_password)
            user.is_email_verified = True
            user.save()
            record.delete()
            return Response({"message": "Password reset successfully. You can now log in."})
        except EmailVerificationCode.DoesNotExist:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
