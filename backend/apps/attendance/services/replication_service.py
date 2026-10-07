"""
AttendanceReplicationService
============================
Single source of truth for replicating an attendance session from one
course to a linked course (e.g. Theory → Lab).

All DB writes are wrapped in a single transaction — if anything fails,
nothing is persisted. Views are kept thin by delegating entirely here.
"""
from django.db import transaction
from django.utils import timezone

from apps.attendance.models import AttendanceSession, AttendanceRecord
from apps.courses.models import Course, CourseLink, Enrollment


class ReplicationError(Exception):
    """Raised when replication cannot proceed for a business-logic reason."""


class AttendanceReplicationService:

    @staticmethod
    @transaction.atomic
    def replicate(
        source_session_id: int,
        target_course_id: int,
        requesting_teacher,
        conflict_strategy: str = "replace",
    ) -> dict:
        """
        Replicate all 'present' records from source_session into a new
        session on target_course.

        Args:
            source_session_id:  PK of the session to copy from.
            target_course_id:   PK of the destination course.
            requesting_teacher: The authenticated User (must teach both courses).
            conflict_strategy:  How to handle an existing same-day session on target.
                                "replace" — delete it and start fresh (default)
                                "merge"   — keep existing records, only fill gaps
                                "skip"    — do nothing, return a 'skipped' status

        Returns a dict with status details.
        Raises ReplicationError for any authorization or business-logic failure.
        """
        source_session = AttendanceReplicationService._get_authorized_session(
            source_session_id, requesting_teacher
        )
        target_course = AttendanceReplicationService._get_authorized_course(
            target_course_id, requesting_teacher
        )

        # Prevent cross-course replication without an admin-configured link
        AttendanceReplicationService._assert_link_exists(
            source_session.course, target_course
        )

        # Detect conflict (another session already exists for target today)
        existing = AttendanceReplicationService._find_same_day_session(
            target_course, source_session.start_time
        )

        if existing:
            if conflict_strategy == "skip":
                return {
                    "status": "skipped",
                    "reason": "session_already_exists",
                    "existing_session_id": existing.id,
                }
            elif conflict_strategy == "replace":
                existing.delete()  # cascades QRTokens and AttendanceRecords
                existing = None
            elif conflict_strategy == "merge":
                pass  # handled per-record below
            else:
                raise ReplicationError(
                    f"Unknown conflict_strategy '{conflict_strategy}'. "
                    "Use 'replace', 'merge', or 'skip'."
                )

        # Create the target session with the same duration as the source
        duration = source_session.expiry_time - source_session.start_time
        now = timezone.now()
        target_session = AttendanceSession.objects.create(
            course=target_course,
            expiry_time=now + duration,
            is_replicated=True,
            replicated_from=source_session,
        )

        # Build a lookup of students enrolled in the target course
        target_enrollments = {
            e.student_id: e
            for e in Enrollment.objects.filter(course=target_course)
        }

        # Collect already-marked students in existing session (merge mode only)
        already_present_ids: set = set()
        if conflict_strategy == "merge" and existing:
            already_present_ids = set(
                AttendanceRecord.objects.filter(session=existing)
                .values_list("enrollment__student_id", flat=True)
            )

        # Clone records — only for students enrolled in the target course
        records_to_create = []
        cloned = 0
        skipped_not_enrolled = 0
        skipped_already_present = 0

        source_records = source_session.records.select_related(
            "enrollment__student"
        ).all()

        for record in source_records:
            student_id = record.enrollment.student_id

            if student_id not in target_enrollments:
                skipped_not_enrolled += 1
                continue

            if student_id in already_present_ids:
                skipped_already_present += 1
                continue

            records_to_create.append(
                AttendanceRecord(
                    enrollment=target_enrollments[student_id],
                    session=target_session,
                    timestamp=record.timestamp,
                    sync_status="synced",
                )
            )
            cloned += 1

        # Bulk-create for efficiency
        AttendanceRecord.objects.bulk_create(records_to_create)

        return {
            "status": "success",
            "target_session_id": target_session.id,
            "target_course_id": target_course.id,
            "target_course_name": target_course.name,
            "records_cloned": cloned,
            "records_skipped_not_enrolled": skipped_not_enrolled,
            "records_skipped_already_present": skipped_already_present,
        }

    # ──────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _get_authorized_session(session_id: int, teacher) -> AttendanceSession:
        try:
            return AttendanceSession.objects.select_related("course").get(
                id=session_id,
                course__course_instructors__instructor=teacher,
            )
        except AttendanceSession.DoesNotExist:
            raise ReplicationError(
                "Source session not found or you do not teach this course."
            )

    @staticmethod
    def _get_authorized_course(course_id: int, teacher) -> Course:
        try:
            return Course.objects.get(
                id=course_id,
                course_instructors__instructor=teacher,
            )
        except Course.DoesNotExist:
            raise ReplicationError(
                "Target course not found or you do not teach it."
            )

    @staticmethod
    def _assert_link_exists(source_course: Course, target_course: Course) -> None:
        """Bidirectional check — admin only needs to create one CourseLink per pair."""
        linked = CourseLink.objects.filter(
            source_course=source_course, target_course=target_course
        ).exists() or CourseLink.objects.filter(
            source_course=target_course, target_course=source_course
        ).exists()

        if not linked:
            raise ReplicationError(
                "No course link exists between these two courses. "
                "Ask your admin to create one in the admin panel."
            )

    @staticmethod
    def _find_same_day_session(
        course: Course, reference_time
    ) -> AttendanceSession | None:
        """Return any session for this course on the same calendar day."""
        day_start = reference_time.replace(hour=0,  minute=0,  second=0,  microsecond=0)
        day_end   = reference_time.replace(hour=23, minute=59, second=59, microsecond=999999)
        return AttendanceSession.objects.filter(
            course=course,
            start_time__range=(day_start, day_end),
        ).first()
