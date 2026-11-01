"""
attendance_saas package initialization.
Ensures Celery app is available when importing attendance_saas.
"""
from .celery import app as celery_app

__all__ = ("celery_app",)
