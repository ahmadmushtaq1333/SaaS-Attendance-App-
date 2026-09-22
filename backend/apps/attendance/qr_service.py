import qrcode
import io
import base64
from django.utils import timezone
from datetime import timedelta
from .models import QRToken

def get_or_create_active_token(session):
    """Returns the current active QR token, creating one if needed."""
    token = session.qr_tokens.filter(expiry_time__gt=timezone.now()).first()
    if not token:
        token = QRToken.objects.create(
            session=session,
            expiry_time=timezone.now() + timedelta(seconds=10)
        )
    return token

def generate_qr_data_uri(token_uuid: str) -> str:
    """Generates a base64-encoded PNG QR code data URI for the given token UUID."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(str(token_uuid))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def get_session_qr_code(session) -> str:
    """Public API: returns a fresh QR data URI for a session."""
    token = get_or_create_active_token(session)
    return generate_qr_data_uri(token.token_uuid)
