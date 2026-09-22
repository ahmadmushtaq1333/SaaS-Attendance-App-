from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import random
import string
import threading
from django.conf import settings
from .models import CustomUser, EmailVerificationCode
from shared.ratelimit import simple_ratelimit
from shared.async_email import send_in_background
from shared.email_utils import get_otp_html_template

def generate_and_send_otp(user, purpose="verify"):
    code = "".join(random.choices(string.digits, k=6))
    expires_at = timezone.now() + timedelta(minutes=15)
    
    EmailVerificationCode.objects.filter(user=user, purpose=purpose).delete()
    EmailVerificationCode.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    subject = "Quorum Activation Code" if purpose == "verify" else "Quorum Password Reset Code"
    message = f"Your verification code is: {code}. It expires in 15 minutes."
    html_message = get_otp_html_template(code, purpose)
    
    print(f"\n======================================================\n[EMAIL LOG - {purpose.upper()}] To: {user.email}\nSubject: {subject}\nMessage: {message}\n======================================================\n")
    from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", user.email)
    
    threading.Thread(
        target=send_in_background,
        args=(subject, message, from_addr, [user.email]),
        kwargs={"html_message": html_message},
        daemon=True
    ).start()
    
    return True, None


class SendVerificationCodeView(APIView):
    permission_classes = [AllowAny]

    @simple_ratelimit(rate='5/m')
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
            if user.is_email_verified:
                return Response({"message": "If the email is unverified and exists, a code has been sent."})
                
            success, err_msg = generate_and_send_otp(user, purpose="verify")
            if not success:
                return Response({"error": f"SMTP email delivery failed: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except CustomUser.DoesNotExist:
            pass
            
        return Response({"message": "If the email is unverified and exists, a code has been sent."})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    @simple_ratelimit(rate='10/m')
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        if not email or not code:
            return Response({"error": "Email and code are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
        except CustomUser.DoesNotExist:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            record = EmailVerificationCode.objects.get(user=user, purpose="verify")
            if record.failed_attempts >= 5:
                return Response({"error": "Too many failed attempts. Request a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if record.expires_at < timezone.now():
                return Response({"error": "Code has expired"}, status=status.HTTP_400_BAD_REQUEST)
            if record.code != code.strip():
                record.failed_attempts += 1
                record.save()
                return Response({"error": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)
            
            user.is_email_verified = True
            user.save()
            record.delete()
            return Response({"message": "Email verified successfully. You can now log in."})
        except EmailVerificationCode.DoesNotExist:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
