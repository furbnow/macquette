#!/bin/sh

DJANGO_SETTINGS_MODULE=config.settings.production /app/manage.py migrate
