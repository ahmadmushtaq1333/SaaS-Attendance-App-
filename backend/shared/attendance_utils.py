def calculate_attendance_percentage(attended_count: int, total_sessions: int) -> float:
    """Single source of truth for attendance % across reports and student views."""
    if total_sessions == 0:
        return 0.0
    return round((attended_count / total_sessions) * 100.0, 2)
