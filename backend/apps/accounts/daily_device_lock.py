"""
Daily Device Lock Service
=========================
Enforces the one-account-per-device-per-calendar-day policy for students.

Design mirrors DeviceBindingService so the codebase stays consistent:
  - A single public static method does all the work.
  - It raises `serializers.ValidationError` on a policy violation.
  - The caller (CustomTokenObtainPairSerializer) does NOT need to know
    any DB logic — just call `verify` and catch the exception.
"""

from django.utils import timezone
from rest_framework import serializers


class DailyDeviceLockService:
    @staticmethod
    def verify(user, device_fingerprint: str) -> None:
        """
        Checks whether `user` is allowed to log in from `device_fingerprint`
        today.  Creates the daily lock record on the first login of the day.

        Raises:
            serializers.ValidationError  with key ``device_locked``
                if a *different* student account has already logged in from
                this fingerprint today.
        """
        if not device_fingerprint:
            return

        from .models import DailyDeviceLock

        today = timezone.now().date()

        # --- Direction 1: Has THIS fingerprint already been used by a different account today? ---
        try:
            fp_lock = DailyDeviceLock.objects.get(device_fingerprint=device_fingerprint, date=today)
            if fp_lock.user_id != user.id:
                raise serializers.ValidationError({
                    "device_locked": True,
                    "detail": (
                        "This device has already been used by another account today. "
                        "Use your own device, or try again tomorrow."
                    ),
                })
            # Same user on same device — perfectly fine
            return
        except DailyDeviceLock.DoesNotExist:
            pass

        # --- Direction 2: Has THIS account already logged in from a different device today? ---
        existing_user_lock = DailyDeviceLock.objects.filter(user=user, date=today).first()
        if existing_user_lock and existing_user_lock.device_fingerprint != device_fingerprint:
            raise serializers.ValidationError({
                "device_locked": True,
                "detail": (
                    "Your account has already been accessed from a different device today. "
                    "Use that device, or try again tomorrow."
                ),
            })

        # --- No lock exists for this fingerprint or user today — create one ---
        DailyDeviceLock.objects.get_or_create(
            device_fingerprint=device_fingerprint,
            date=today,
            defaults={"user": user},
        )

