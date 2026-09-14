"""
Email templates for attendance warning notifications.
Keeps content separate from view logic for modularity and maintainability.
"""

TIER_CONFIG = {
    "CRITICAL": {
        "threshold": 25,
        "severity_text": "CRITICAL",
        "action_required": "Immediate action is required. You are at severe risk of academic penalty or course failure due to non-attendance.",
        "color": "#dc2626" # Red
    },
    "SEVERE": {
        "threshold": 50,
        "severity_text": "SEVERE",
        "action_required": "Urgent improvement is needed. Please ensure you attend the upcoming sessions to meet the minimum requirements.",
        "color": "#ea580c" # Orange
    },
    "WARNING": {
        "threshold": 75,
        "severity_text": "WARNING",
        "action_required": "Your attendance has fallen below the acceptable threshold. Consistent attendance is expected moving forward.",
        "color": "#ca8a04" # Yellow
    }
}

def get_tier_for_percentage(percentage):
    """
    Determine the attendance tier based on percentage.
    Returns the tier name or None if >= 75%.
    """
    if percentage < 25.0:
        return "CRITICAL"
    elif percentage < 50.0:
        return "SEVERE"
    elif percentage < 75.0:
        return "WARNING"
    return None

def get_bulk_tier_email(course_name, tier):
    """
    Returns (subject, plain_body, html_body) for a generic bulk tier notification.
    """
    config = TIER_CONFIG.get(tier)
    if not config:
        raise ValueError(f"Invalid tier: {tier}")
        
    subject = f"[{config['severity_text']}] Attendance Warning: {course_name}"
    
    # Plain text version
    plain_body = f"""Dear Student,

This is an automated notification regarding your attendance in the course: {course_name}.

Your current attendance has fallen below the {config['threshold']}% threshold, placing you in the {config['severity_text']} tier.

{config['action_required']}

Please review your attendance records on the student portal and contact your instructor if you believe this is an error or if you require assistance.

Regards,
Attendance Management System
"""

    # HTML version
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: {config['color']}; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          Attendance Warning
        </h2>
        <p>Dear Student,</p>
        <p>This is an automated notification regarding your attendance in the course: <strong>{course_name}</strong>.</p>
        <div style="background-color: #f9f9f9; border-left: 4px solid {config['color']}; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;">Your current attendance has fallen below the <strong>{config['threshold']}%</strong> threshold.</p>
          <p style="margin: 0; font-weight: bold; color: {config['color']};">{config['action_required']}</p>
        </div>
        <p>Please review your attendance records on the student portal and contact your instructor if you believe this is an error or if you require assistance.</p>
        <br>
        <p style="font-size: 0.9em; color: #666;">
          Regards,<br>
          Attendance Management System
        </p>
      </body>
    </html>
    """
    
    return subject, plain_body, html_body
