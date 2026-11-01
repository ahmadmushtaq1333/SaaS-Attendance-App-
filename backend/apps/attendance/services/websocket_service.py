"""
WebSocket Broadcast Service.

Provides helper methods to dispatch real-time events to connected instructors
over Django Channels channel layers safely without blocking the request/response cycle.
"""
import logging
import asyncio
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def safe_broadcast(group_name: str, message: dict):
    """
    Safely sends a message to a channel layer group.
    Supports execution both from standard synchronous views (via async_to_sync)
    and from active event loop contexts (e.g. async consumers, tests, or async tasks).
    Catches and logs any exceptions so communication failures never
    interrupt critical business logic (e.g. attendance records).
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        # Check if an event loop is already running in this thread
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            loop.create_task(channel_layer.group_send(group_name, message))
        else:
            async_to_sync(channel_layer.group_send)(group_name, message)
    except Exception as exc:
        logger.warning("Failed to broadcast WebSocket event to %s: %s", group_name, exc)


def broadcast_attendance_marked(session_id: int, student, record, present_count: int, total_enrolled: int):
    """Broadcasts a live notification when a student scans and marks attendance."""
    group_name = f"session_{session_id}"
    payload = {
        "type": "attendance_marked",
        "data": {
            "session_id": session_id,
            "student_id": student.id,
            "student_email": student.email,
            "student_name": getattr(student, "full_name", "") or student.email,
            "registration_number": getattr(student, "registration_number", None),
            "timestamp": record.timestamp.isoformat(),
            "present_count": present_count,
            "total_enrolled": total_enrolled,
        }
    }
    safe_broadcast(group_name, payload)


def broadcast_roster_override(session_id: int, student_ids: list, action: str, present_count: int):
    """Broadcasts when an instructor overrides one or more attendance records."""
    group_name = f"session_{session_id}"
    payload = {
        "type": "roster_override",
        "data": {
            "session_id": session_id,
            "student_ids": student_ids,
            "action": action,
            "present_count": present_count,
        }
    }
    safe_broadcast(group_name, payload)


def broadcast_session_stopped(session_id: int):
    """Broadcasts when an instructor manually ends an attendance session."""
    group_name = f"session_{session_id}"
    payload = {
        "type": "session_stopped",
        "data": {
            "session_id": session_id,
            "status": "stopped",
        }
    }
    safe_broadcast(group_name, payload)
