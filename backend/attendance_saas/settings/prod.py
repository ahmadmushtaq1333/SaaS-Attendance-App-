from .base import *
from decouple import config

DEBUG = False

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

# MySQL DB configuration for production
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": config("DB_NAME", default="attendance_db"),
        "USER": config("DB_USER", default="root"),
        "PASSWORD": config("DB_PASSWORD", default="rootpassword"),
        "HOST": config("DB_HOST", default="db"),
        "PORT": config("DB_PORT", default="3306"),
    }
}
