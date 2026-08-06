#!/bin/sh
# Runs on every container start before handing off to the CMD (gunicorn by
# default). Applies migrations and collects static files so `docker compose
# up` is enough to get a working instance - no manual `manage.py` steps.
set -e

echo "Waiting for database..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

exec "$@"
