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


from django.conf import settings

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
    
    # Send or Log
    print(f"\n======================================================\n[EMAIL LOG - {purpose.upper()}] To: {user.email}\nSubject: {subject}\nMessage: {message}\n======================================================\n")
    try:
        from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", user.email)
        send_mail(
            subject,
            message,
            from_addr,
            [user.email],
            fail_silently=False
        )
        return True, None
    except Exception as e:
        print(f"SMTP send failed: {e}")
        return False, str(e)


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

