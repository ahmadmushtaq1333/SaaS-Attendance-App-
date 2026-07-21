from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source="institution.name", read_only=True)

    class Meta:
        model = CustomUser
        fields = ("id", "email", "role", "institution", "institution_name", "date_joined", "is_superuser")
        read_only_fields = ("id", "date_joined", "is_superuser")
