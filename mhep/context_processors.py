from django.conf import settings as django_settings


def settings(request) -> dict:
    return {"settings": {"sentry_url": django_settings.SENTRY_DSN}}
