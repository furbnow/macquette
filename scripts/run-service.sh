#/bin/sh

exec /usr/local/bin/gunicorn config.wsgi --bind 0.0.0.0:5000 --chdir /app --timeout 120 --log-level debug
