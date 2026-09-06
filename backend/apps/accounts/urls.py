from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    MeView,
    UserCoursesView,
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    SendVerificationCodeView,
    VerifyEmailView,
    RequestPasswordResetView,
    ConfirmPasswordResetView,
    ResetDeviceBindingView,
    RequestDeviceRebindView,
    ConfirmDeviceRebindView,
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="user_me"),
    path("courses/", UserCoursesView.as_view(), name="user_courses"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("send-otp/", SendVerificationCodeView.as_view(), name="send_otp"),
    path("request-password-reset/", RequestPasswordResetView.as_view(), name="request_password_reset"),
    path("confirm-password-reset/", ConfirmPasswordResetView.as_view(), name="confirm_password_reset"),
    path("request-device-rebind/", RequestDeviceRebindView.as_view(), name="request_device_rebind"),
    path("confirm-device-rebind/", ConfirmDeviceRebindView.as_view(), name="confirm_device_rebind"),
    path("<int:user_id>/reset-device/", ResetDeviceBindingView.as_view(), name="reset_device_binding"),
]
