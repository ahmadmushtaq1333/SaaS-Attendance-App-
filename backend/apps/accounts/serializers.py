from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("id", "email", "role", "institution", "date_joined")
        read_only_fields = ("id", "date_joined")
