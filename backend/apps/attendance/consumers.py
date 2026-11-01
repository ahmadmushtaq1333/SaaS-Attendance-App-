import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from apps.attendance.models import AttendanceSession


class AttendanceSessionConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for streaming real-time live attendance updates
    to instructors and administrators.
    """

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.room_group_name = f"session_{self.session_id}"
        self.user = self.scope.get("user")

        # 1. Reject unauthenticated connections
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4401)
            return

        # 2. Verify permission: teacher must instruct course or be admin/staff
        has_permission = await self.check_session_permission(self.user, self.session_id)
        if not has_permission:
            await self.close(code=4403)
            return

        # 3. Join the session's broadcast group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send immediate handshake confirmation
        await self.send_json({
            "type": "connection.ready",
            "session_id": int(self.session_id),
            "message": "Connected to real-time live attendance feed",
        })

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        """Handle incoming messages from client (e.g. heartbeat / ping)."""
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong"})

    # ── Handlers for group broadcasts ──────────────────────────────────────────

    async def attendance_marked(self, event):
        """Triggered when a student successfully scans and marks attendance."""
        await self.send_json({
            "type": "attendance.marked",
            "data": event.get("data", {}),
        })

    async def roster_override(self, event):
        """Triggered when an instructor overrides a student's attendance."""
        await self.send_json({
            "type": "roster.override",
            "data": event.get("data", {}),
        })

    async def session_stopped(self, event):
        """Triggered when the attendance session is manually stopped/ended."""
        await self.send_json({
            "type": "session.stopped",
            "data": event.get("data", {}),
        })

    # ── Database authorization helper ─────────────────────────────────────────

    @database_sync_to_async
    def check_session_permission(self, user, session_id):
        """
        Verifies that the user has authority to monitor this session.
        Allowed: Admins, superusers, staff, or teachers assigned to the course.
        """
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False) or getattr(user, "role", "") == "admin":
            return True

        if getattr(user, "role", "") == "teacher":
            return AttendanceSession.objects.filter(
                id=session_id,
                course__course_instructors__instructor=user
            ).exists()

        return False
