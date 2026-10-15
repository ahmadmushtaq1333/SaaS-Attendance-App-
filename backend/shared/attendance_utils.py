import math

def calculate_attendance_percentage(attended_count: int, total_sessions: int) -> float:
    """Single source of truth for attendance % across reports and student views."""
    if total_sessions == 0:
        return 0.0
    return round((attended_count / total_sessions) * 100.0, 2)


def calculate_attendance_safety(attended_count: int, total_sessions: int, target_pct: float = 75.0) -> dict:
    """
    Computes attendance safety metrics in simple, clear terms:
    - safe_to_miss: how many future classes the student can safely skip while staying >= target_pct.
    - needed_to_recover: how many consecutive future classes the student must attend to reach >= target_pct.
    - status: 'safe' | 'warning' | 'critical' | 'unstarted'
    - message: Plain English summary explanation for students.
    """
    if total_sessions <= 0:
        return {
            "attendance_percentage": 0.0,
            "target_pct": target_pct,
            "safe_to_miss": 0,
            "needed_to_recover": 0,
            "status": "unstarted",
            "message": "No classes have been held yet. You are all set!",
        }

    # Defensive clamping
    attended = max(0, min(attended_count, total_sessions))
    pct = calculate_attendance_percentage(attended, total_sessions)
    target_ratio = target_pct / 100.0

    if pct >= target_pct:
        # If student skips 'm' classes: attended / (total + m) >= target_ratio
        # m <= (attended / target_ratio) - total
        if target_ratio > 0:
            safe_to_miss = max(0, int(math.floor((attended / target_ratio) - total_sessions)))
        else:
            safe_to_miss = 999
        needed_to_recover = 0
        if safe_to_miss == 0:
            status = "warning"
            message = f"You are right on the edge at {pct}%. You cannot miss the next class without dropping below {target_pct}%."
        else:
            status = "safe"
            class_str = "class" if safe_to_miss == 1 else "classes"
            message = f"You are in the safe zone! You can safely miss up to {safe_to_miss} more {class_str}."
    else:
        # If student attends 'c' consecutive classes: (attended + c) / (total + c) >= target_ratio
        # c * (1 - target_ratio) >= target_ratio * total - attended
        # c >= (target_ratio * total - attended) / (1 - target_ratio)
        one_minus_target = 1.0 - target_ratio
        if one_minus_target > 0:
            needed = (target_ratio * total_sessions - attended) / one_minus_target
            needed_to_recover = max(1, int(math.ceil(needed)))
        else:
            needed_to_recover = 999
        safe_to_miss = 0
        status = "critical" if pct < 50.0 else "warning"
        class_str = "class" if needed_to_recover == 1 else "classes"
        message = f"You are below {target_pct}%. You must attend the next {needed_to_recover} {class_str} in a row to get back on track."

    return {
        "attendance_percentage": pct,
        "target_pct": target_pct,
        "safe_to_miss": safe_to_miss,
        "needed_to_recover": needed_to_recover,
        "status": status,
        "message": message,
    }

