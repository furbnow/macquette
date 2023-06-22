# ---------------------------------------------------------------------------
# Build client assets
# ---------------------------------------------------------------------------

FROM node:lts-alpine as js

RUN apk add make

WORKDIR /app/client/
COPY ./client/package.json ./client/package-lock.json /app/client/
RUN npm clean-install --omit dev --ignore-scripts

COPY ./client/ /app/client/
COPY ./Makefile /app/

RUN make -C .. js-prod

# ---------------------------------------------------------------------------
# Build Django container
# ---------------------------------------------------------------------------

# We're using "slim" (which is a cut down Debian stable) because Debian is a
# much more standard setup than alpine with the potential for a lot less faff
# later on if we need to install more obscure dependencies.
FROM python:3.10-slim AS main

# Don't buffer output - we should always get error messages this way
ENV PYTHONUNBUFFERED 1

# Don't write bytecode to disk
ENV PYTHONDONTWRITEBYTECODE 1

# Set up our user
RUN addgroup --system django \
    && adduser --system --ingroup django django

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
       make libharfbuzz-bin libpango-1.0-0 pangoft2-1.0-0

# Requirements are installed here to ensure they will be cached.
COPY ./server/requirements /app/requirements
WORKDIR /app
RUN pip install --no-cache-dir -r ./requirements/production.txt

# Copy in Django app
COPY ./server/manage.py ./
COPY ./server/config ./config
COPY ./server/macquette ./macquette
COPY ./scripts ./scripts
COPY scripts/migrate scripts/webserver ./

# Copy in built JS assets
COPY --from=js /app/server/macquette/v2/static/v2/js_generated/ /app/macquette/v2/static/v2/js_generated/

# Collect static files for faster serving and caching
RUN DJANGO_SETTINGS_MODULE=config.settings.staticfiles \
    DATABASE_URL='postgres://u:p@h/db' \
    python manage.py collectstatic --noinput

USER django

EXPOSE 5000
CMD [ "/app/webserver" ]
