from django.db import models
from django.conf import settings

class WebAuthnCredential(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="webauthn_credentials")
    credential_id = models.CharField(max_length=255, unique=True, db_index=True)
    public_key = models.TextField()
    sign_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Passkey for {self.user.email}"
