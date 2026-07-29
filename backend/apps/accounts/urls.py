from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    MeView,
    UserCoursesView,
    CustomTokenObtainPairView,
    SendVerificationCodeView,
    VerifyEmailView,
    RequestPasswordResetView,
    ConfirmPasswordResetView
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="user_me"),
    path("courses/", UserCoursesView.as_view(), name="user_courses"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("send-otp/", SendVerificationCodeView.as_view(), name="send_otp"),
    path("request-password-reset/", RequestPasswordResetView.as_view(), name="request_password_reset"),
    path("confirm-password-reset/", ConfirmPasswordResetView.as_view(), name="confirm_password_reset"),
]
