#!/usr/bin/env bash
echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating shared cache table (idempotent)..."
python manage.py createcachetable

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --log-level info attendance_saas.wsgi:application
