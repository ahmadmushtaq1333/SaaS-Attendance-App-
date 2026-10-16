"""
Registration Number Utilities
==============================
Provides a single, canonical function for deriving a student registration
number from their institutional email address.

Design goals:
  - Pure function: no DB access, no side effects, easy to unit-test.
  - Idempotent: calling it twice with the same email returns the same value.
  - Caller decides whether to use it (never overwrites an explicit value).

Usage pattern (in serializers / views):
    from .registration_number import derive_registration_number

    # Only auto-assign if the caller did not supply one:
    if not validated_data.get("registration_number"):
        email = validated_data.get("email", "")
        validated_data["registration_number"] = derive_registration_number(email)
"""


def derive_registration_number(email: str) -> str | None:
    """
    Extract the local part of an email address and return it as a
    registration number (uppercased).

    Examples:
        "24pwswe0018@mit.edu"  -> "24PWSWE0018"
        "john.doe@uni.ac.pk"   -> "JOHN.DOE"
        ""                     -> None
        "not-an-email"         -> None   (no '@' present)

    Returns:
        str  — the local part in uppercase, or
        None — if the email is blank or malformed.
    """
    if not email or "@" not in email:
        return None
    local_part = email.split("@")[0].strip()
    return local_part.upper() if local_part else None
