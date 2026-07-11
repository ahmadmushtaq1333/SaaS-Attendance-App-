FROM python:3.11-slim

# Install system dependencies (mysqlclient needs gcc + libmysqlclient)
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files for WhiteNoise to serve
RUN DJANGO_SETTINGS_MODULE=attendance_saas.settings.prod \
    SECRET_KEY=build-time-placeholder \
    DB_HOST=localhost \
    MYSQLDATABASE=placeholder \
    MYSQLUSER=placeholder \
    MYSQLPASSWORD=placeholder \
    MYSQLHOST=localhost \
    MYSQLPORT=3306 \
    python manage.py collectstatic --noinput || true

EXPOSE 8000

# Railway sets $PORT dynamically; fall back to 8000 for local Docker
CMD python manage.py migrate --noinput && \
    gunicorn --bind 0.0.0.0:${PORT:-8000} \
             --workers 2 \
             --timeout 120 \
             attendance_saas.wsgi:application
