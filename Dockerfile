# ---------------------------------------------------------------------------
# Build client assets
# ---------------------------------------------------------------------------

FROM node:lts-alpine as js

RUN apk add make

WORKDIR /app/client/
COPY ./client/package.json ./client/yarn.lock /app/client/
RUN yarn install --production

COPY ./client/ /app/client/
COPY ./Makefile /app/

RUN make -C .. js-prod

# ---------------------------------------------------------------------------
# Build Django container
# ---------------------------------------------------------------------------

# We're using "slim" (which is a cut down Debian stable) because Debian is a
# much more standard setup than alpine with the potential for a lot less faff
# later on if we need to install more obscure dependencies.
FROM python:3.9-slim AS main

# Don't buffer output - we should always get error messages this way
ENV PYTHONUNBUFFERED 1

# Don't write bytecode to disk
ENV PYTHONDONTWRITEBYTECODE 1

# Set up our user
RUN addgroup --system django \
    && adduser --system --ingroup django django

# Requirements are installed here to ensure they will be cached.
COPY ./requirements /app/requirements
WORKDIR /app
RUN pip install --no-cache-dir -r ./requirements/production.txt

# Copy in Django app
COPY ./config ./config
COPY ./mhep ./mhep
COPY ./scripts ./scripts
COPY ./manage.py ./

# Copy in built JS assets
COPY --from=js /app/mhep/dev/static/dev/js_generated/ /app/mhep/dev/static/dev/js_generated/
COPY --from=js /app/mhep/v2/static/v2/js_generated/ /app/mhep/v2/static/v2/js_generated/

# Collect static files for faster serving and caching
RUN DJANGO_SETTINGS_MODULE=config.settings.staticfiles \
    DATABASE_URL='postgres://u:p@h/db' \
    python manage.py collectstatic --noinput

USER django

EXPOSE 5000
CMD [ "/usr/local/bin/gunicorn", "config.wsgi", "--bind", "0.0.0.0:5000", "--chdir", "/app", "--timeout", "120", "--log-level", "debug" ]
