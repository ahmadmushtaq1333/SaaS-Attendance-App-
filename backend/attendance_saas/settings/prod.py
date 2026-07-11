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

CORS_ALLOWED_ORIGINS = _cors_origins
