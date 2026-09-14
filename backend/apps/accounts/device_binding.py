import uuid
from django.db import IntegrityError
from rest_framework import serializers

class DeviceBindingService:
    @staticmethod
    def verify_or_bind(user, incoming_token: str | None, user_agent: str = "") -> str:
        """
        Returns the canonical device token for this session.
        Raises serializers.ValidationError on mismatch.
        """
        from .models import DeviceBinding
        
        try:
            # Check if user already has a binding
            binding = DeviceBinding.objects.get(user=user)
            
            # Binding exists. If no token provided or token doesn't match, it's a mismatch.
            if not incoming_token or str(binding.token) != incoming_token:
                raise serializers.ValidationError({
                    "device_mismatch": True,
                    "detail": "This account is linked to another device. Please use your original device or verify your identity to reset the binding."
                })
            
            # Update last seen
            binding.user_agent = user_agent
            binding.save(update_fields=['last_seen', 'user_agent'])
            return str(binding.token)
            
        except DeviceBinding.DoesNotExist:
            # No binding exists. Create one. Handle race condition with get_or_create.
            try:
                binding, created = DeviceBinding.objects.get_or_create(
                    user=user,
                    defaults={'user_agent': user_agent}
                )
                if not created:
                    # Race condition triggered and we fetched existing one.
                    # Verify token just in case
                    if not incoming_token or str(binding.token) != incoming_token:
                        raise serializers.ValidationError({
                            "device_mismatch": True,
                            "detail": "This account is linked to another device. Please use your original device or verify your identity to reset the binding."
                        })
                    binding.user_agent = user_agent
                    binding.save(update_fields=['last_seen', 'user_agent'])
                return str(binding.token)
            except IntegrityError:
                # Fallback if get_or_create fails on unique constraint concurrently
                binding = DeviceBinding.objects.get(user=user)
                if not incoming_token or str(binding.token) != incoming_token:
                    raise serializers.ValidationError({
                        "device_mismatch": True,
                        "detail": "This account is linked to another device. Please use your original device or verify your identity to reset the binding."
                    })
                return str(binding.token)
