from .base import *
from decouple import config
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
DEBUG = False

# ── HTTPS / Proxy hardening ───────────────────────────────────────────────────
# Railway terminates TLS at its proxy; this tells Django the request is HTTPS.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True

# HSTS — instruct browsers to always use HTTPS for 1 year.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookie hardening — required for CookieJWTAuthentication over HTTPS.
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# ── Logging ───────────────────────────────────────────────────────────────────
# Replaces relying solely on Sentry; surfaces slow queries, auth warnings, etc.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

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
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost,http://localhost:80,http://localhost:5173",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# Append Vercel domain automatically if set
if VERCEL_DOMAIN:
    vercel_https = f"https://{VERCEL_DOMAIN}"
    if vercel_https not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(vercel_https)

# ── CSRF trusted origins ───────────────────────────────────────────────────────
# Required for cross-origin cookie auth (Vercel frontend → Railway backend).
# Django 4.0+ requires this for any cross-origin POST that sends a CSRF cookie.
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
if VERCEL_DOMAIN:
    vercel_https = f"https://{VERCEL_DOMAIN}"
    if vercel_https not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(vercel_https)
if RAILWAY_DOMAIN:
    railway_https = f"https://{RAILWAY_DOMAIN}"
    if railway_https not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(railway_https)

# ── Email: Brevo HTTP API via django-anymail ──────────────────────────────────
# Uses HTTPS port 443 — immune to Railway's raw SMTP port blocks.
# Allows sending to arbitrary recipients on free tier.
EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
ANYMAIL = {
    "BREVO_API_KEY": config("BREVO_API_KEY", default=""),
}
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="Quorum <muhammadahmadmushtaq11@gmail.com>")

#Sentry configuration for error tracking and performance monitoring
sentry_sdk.init(
    dsn=config("SENTRY_DSN", default=""),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,  # 10% of requests tracked for performance monitoring
    send_default_pii=False,  # Don't send personal user data automatically
    environment="production",
)