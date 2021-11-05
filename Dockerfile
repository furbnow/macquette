# ---------------------------------------------------------------------------
# Build assets (Fancy JS->Boring JS)
# ---------------------------------------------------------------------------

FROM node:lts as js

WORKDIR /app

COPY ./package.json ./package-lock.json ./Makefile ./
RUN npm ci --production
COPY ./mhep/dev/static/dev/js_src/ ./mhep/dev/static/dev/js_src/
RUN make js-prod

# ---------------------------------------------------------------------------
# Django container build
# ---------------------------------------------------------------------------

# We're using "slim" (which is a cut down Debian stable) because Debian is a
# much more standard setup than Alpine with the potential for a lot less faff
# later on if we need to install more obscure dependencies.
FROM python:3.7-slim AS main

WORKDIR /app

# Don't buffer output - we should always get error messages this way
ENV PYTHONUNBUFFERED 1

# Don't write bytecode to disk
ENV PYTHONDONTWRITEBYTECODE 1

# Set up our user
RUN addgroup --system django \
    && adduser --system --ingroup django django

# Requirements are installed here to ensure they will be cached.
COPY ./requirements ./requirements
RUN pip install --no-cache-dir -r ./requirements/production.txt

# Copy in everything else
COPY ./ ./

# Copy in built JS assets
COPY --from=js /app/mhep/dev/static/dev/js_generated/ ./mhep/dev/static/dev/js_generated/

# Collect static files for faster serving and caching
RUN DJANGO_SETTINGS_MODULE=config.settings.staticfiles \
	DATABASE_URL='postgres://u:p@h/db' \
	python manage.py collectstatic --noinput

USER django

EXPOSE 5000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["/usr/local/bin/gunicorn", "config.wsgi", "--bind=0.0.0.0:5000", "--chdir=/app"]
