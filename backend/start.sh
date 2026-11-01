#!/usr/bin/env bash
echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating shared cache table (idempotent)..."
python manage.py createcachetable

echo "Starting ASGI Server (Daphne)..."
exec daphne -b 0.0.0.0 -p ${PORT:-8000} attendance_saas.asgi:application
