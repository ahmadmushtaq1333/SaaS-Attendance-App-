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
            # No fingerprint supplied (e.g. teacher / admin web login).
            # Policy only applies when a fingerprint is present.
            return

        from .models import DailyDeviceLock

        today = timezone.now().date()

        lock, created = DailyDeviceLock.objects.get_or_create(
            device_fingerprint=device_fingerprint,
            date=today,
            defaults={"user": user},
        )

        if not created and lock.user_id != user.id:
            raise serializers.ValidationError({
                "device_locked": True,
                "detail": (
                    "This device has already been used by another account today. "
                    "Use your own device, or try again tomorrow."
                ),
            })
