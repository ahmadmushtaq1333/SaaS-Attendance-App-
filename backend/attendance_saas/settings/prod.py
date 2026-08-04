from .base import *
from decouple import config

DEBUG = False

# Railway provides the app's public URL automatically
# RAILWAY_PUBLIC_DOMAIN is set by Railway for each service
RAILWAY_DOMAIN = config("RAILWAY_PUBLIC_DOMAIN", default="")
VERCEL_DOMAIN = config("VERCEL_DOMAIN", default="")

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1"
).split(",")

# Append Railway domain automatically if set
if RAILWAY_DOMAIN and RAILWAY_DOMAIN not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RAILWAY_DOMAIN)

# ── MySQL Database (Railway MySQL plugin env vars) ─────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": config("MYSQLDATABASE", default=config("DB_NAME", default="attendance_db")),
        "USER": config("MYSQLUSER", default=config("DB_USER", default="root")),
        "PASSWORD": config("MYSQLPASSWORD", default=config("DB_PASSWORD", default="rootpassword")),
        "HOST": config("MYSQLHOST", default=config("DB_HOST", default="db")),
        "PORT": config("MYSQLPORT", default=config("DB_PORT", default="3306")),
        "OPTIONS": {
            "charset": "utf8mb4",
            "connect_timeout": 10,
        },
    }
}

# ── WhiteNoise for static file serving ─────────────────────────────────────────
# Insert WhiteNoise middleware right after SecurityMiddleware
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",   # <── serves /static/ files
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ── CORS: allow Vercel frontend ────────────────────────────────────────────────
_cors_origins = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost,http://localhost:80,http://localhost:5173",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# Append Vercel domain automatically if set
if VERCEL_DOMAIN:
    vercel_https = f"https://{VERCEL_DOMAIN}"
    if vercel_https not in _cors_origins:
        _cors_origins.append(vercel_https)

# ── Email Settings ─────────────────────────────────────────────────────────────
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="muhammadahmadmushtaq11@gmail.com")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="eartviefrjhzoger")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_USE_SSL = config("EMAIL_USE_SSL", default=False, cast=bool)

if EMAIL_PORT == 465:
    EMAIL_USE_SSL = True
    EMAIL_USE_TLS = False

if EMAIL_USE_SSL:
    EMAIL_USE_TLS = False

default_from = f"Attend AI <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "Attend AI <noreply@attendai.com>"
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default=default_from)

if not EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

