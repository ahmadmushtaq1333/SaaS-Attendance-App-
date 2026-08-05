from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
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


import random
import string
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from .models import CustomUser, EmailVerificationCode


import threading
from django.conf import settings

def _send_mail_in_background(subject, message, from_addr, recipient_list, html_message=None):
    try:
        send_mail(
            subject,
            message,
            from_addr,
            recipient_list,
            fail_silently=False,
            html_message=html_message
        )
        print(f"[ASYNC EMAIL SENT] To: {recipient_list}")
    except Exception as e:
        print(f"[ASYNC EMAIL FAILED]: {e}")

def get_otp_html_template(code, purpose="verify"):
    if purpose == "verify":
        title = "Activate Your Account"
        instructions = "Thank you for joining Attend AI! Please use the 6-digit verification code below to verify your email address and activate your account."
    else:
        title = "Reset Your Password"
        instructions = "We received a request to reset your password. Use the 6-digit security code below to complete the verification step."

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attend AI Security Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header Accent Banner -->
          <tr>
            <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, #4f46e5, #0d9488);">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px;">Attend AI</h1>
              <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 500;">Attendance Management System</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 35px; background-color: #ffffff;">
              <h2 style="margin-top: 0; margin-bottom: 15px; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">
                {title}
              </h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                {instructions}
              </p>
              
              <!-- Monospaced Code Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 28px; display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #4f46e5; letter-spacing: 5px; text-shadow: 1px 1px 0px #ffffff;">
                      {code}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #dc2626; font-size: 12px; font-weight: 600; text-align: center; margin-top: 0; margin-bottom: 30px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                ⏱️ This code is valid for 15 minutes.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center; margin: 0;">
                If you did not initiate this action, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Bottom Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                &copy; 2026 Attend AI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def generate_and_send_otp(user, purpose="verify"):
    # Generate 6-digit numeric OTP
    code = "".join(random.choices(string.digits, k=6))
    expires_at = timezone.now() + timedelta(minutes=15)
    
    # Save code to DB
    EmailVerificationCode.objects.filter(user=user, purpose=purpose).delete()
    EmailVerificationCode.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    subject = "Attend AI Activation Code" if purpose == "verify" else "Attend AI Password Reset Code"
    message = f"Your verification code is: {code}. It expires in 15 minutes."
    html_message = get_otp_html_template(code, purpose)
    
    # Send or Log
    print(f"\n======================================================\n[EMAIL LOG - {purpose.upper()}] To: {user.email}\nSubject: {subject}\nMessage: {message}\n======================================================\n")
    from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", user.email)
    
    # Dispatch email sending to background thread so HTTP response returns instantly
    threading.Thread(
        target=_send_mail_in_background,
        args=(subject, message, from_addr, [user.email]),
        kwargs={"html_message": html_message},
        daemon=True
    ).start()
    
    return True, None


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class SendVerificationCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if user.is_email_verified:
            return Response({"message": "Email is already verified"}, status=status.HTTP_400_BAD_REQUEST)
            
        success, err_msg = generate_and_send_otp(user, purpose="verify")
        if not success:
            return Response({"error": f"SMTP email delivery failed: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"message": "Verification code sent to your email."})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        if not email or not code:
            return Response({"error": "Email and code are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            record = EmailVerificationCode.objects.get(user=user, code=code.strip(), purpose="verify")
            if record.expires_at < timezone.now():
                return Response({"error": "Code has expired"}, status=status.HTTP_400_BAD_REQUEST)
            
            user.is_email_verified = True
            user.save()
            record.delete()
            return Response({"message": "Email verified successfully. You can now log in."})
        except EmailVerificationCode.DoesNotExist:
            return Response({"error": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)


class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

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

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("password")
        if not email or not code or not new_password:
            return Response({"error": "Email, code, and new password are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = CustomUser.objects.get(email=email.strip().lower())
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            record = EmailVerificationCode.objects.get(user=user, code=code.strip(), purpose="reset")
            if record.expires_at < timezone.now():
                return Response({"error": "Code has expired"}, status=status.HTTP_400_BAD_REQUEST)
                
            user.set_password(new_password)
            user.is_email_verified = True  # Auto-verify email on successful password reset OTP confirmation
            user.save()
            record.delete()
            return Response({"message": "Password reset successfully. You can now log in."})
        except EmailVerificationCode.DoesNotExist:
            return Response({"error": "Invalid password reset code"}, status=status.HTTP_400_BAD_REQUEST)

