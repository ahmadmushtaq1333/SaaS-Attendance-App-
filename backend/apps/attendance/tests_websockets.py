from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from channels.testing import WebsocketCommunicator
from attendance_saas.asgi import application
from apps.institutions.models import Institution, Department
from apps.courses.models import Course, CourseInstructor
from apps.attendance.models import AttendanceSession
from apps.attendance.services.websocket_service import (
    broadcast_attendance_marked,
    broadcast_roster_override,
    broadcast_session_stopped,
)
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class WebSocketLiveFeedTestCase(TestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name="MIT", slug="mit")
        self.dept = Department.objects.create(name="CS", institution=self.institution)
        self.teacher = User.objects.create_user(
            email="teacher_ws@mit.edu", password="password123", role="teacher", institution=self.institution
        )
        self.other_teacher = User.objects.create_user(
            email="other_teacher@mit.edu", password="password123", role="teacher", institution=self.institution
        )
        self.student = User.objects.create_user(
            email="student_ws@mit.edu", password="password123", role="student", institution=self.institution
        )
        self.course = Course.objects.create(name="OS", institution=self.institution, department=self.dept)
        CourseInstructor.objects.create(course=self.course, instructor=self.teacher, is_primary=True)

        self.session = AttendanceSession.objects.create(
            course=self.course,
            expiry_time=timezone.now() + timedelta(minutes=60)
        )

    async def test_unauthenticated_connection_rejected(self):
        communicator = WebsocketCommunicator(
            application,
            f"/ws/sessions/{self.session.id}/"
        )
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4401)
        await communicator.disconnect()

    async def test_unauthorized_teacher_rejected(self):
        # other_teacher does NOT instruct this course
        token = str(AccessToken.for_user(self.other_teacher))
        communicator = WebsocketCommunicator(
            application,
            f"/ws/sessions/{self.session.id}/?token={token}"
        )
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4403)
        await communicator.disconnect()

    async def test_authorized_instructor_receives_broadcasts(self):
        token = str(AccessToken.for_user(self.teacher))
        communicator = WebsocketCommunicator(
            application,
            f"/ws/sessions/{self.session.id}/?token={token}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)

        # 1. Expect initial handshake
        handshake = await communicator.receive_json_from()
        self.assertEqual(handshake["type"], "connection.ready")
        self.assertEqual(handshake["session_id"], self.session.id)

        # 2. Test attendance.marked broadcast
        class MockRecord:
            timestamp = timezone.now()

        import asyncio

        broadcast_attendance_marked(
            self.session.id,
            self.student,
            MockRecord(),
            present_count=1,
            total_enrolled=25
        )
        await asyncio.sleep(0.05)
        event = await communicator.receive_json_from()
        self.assertEqual(event["type"], "attendance.marked")
        self.assertEqual(event["data"]["student_id"], self.student.id)
        self.assertEqual(event["data"]["present_count"], 1)

        # 3. Test roster override broadcast
        broadcast_roster_override(self.session.id, [self.student.id], "present", 1)
        await asyncio.sleep(0.05)
        override_event = await communicator.receive_json_from()
        self.assertEqual(override_event["type"], "roster.override")
        self.assertEqual(override_event["data"]["action"], "present")

        # 4. Test session stopped broadcast
        broadcast_session_stopped(self.session.id)
        await asyncio.sleep(0.05)
        stopped_event = await communicator.receive_json_from()
        self.assertEqual(stopped_event["type"], "session.stopped")

        await communicator.disconnect()
