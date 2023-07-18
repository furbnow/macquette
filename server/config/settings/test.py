"""
With these settings, tests run faster.
"""
import os

os.environ["DJANGO_READ_DOT_ENV_FILE"] = "true"
from .base import *  # noqa: E402, F403
from .base import (  # noqa: E402
    TEMPLATES,
    env,
)

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = False
# https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
SECRET_KEY = "testing-secret-key"
# https://docs.djangoproject.com/en/dev/ref/settings/#test-runner
TEST_RUNNER = "django.test.runner.DiscoverRunner"

# Turn off whitenoise for test runs
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

# CACHES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#caches
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "",
    }
}

# PASSWORDS
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#password-hashers
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# TEMPLATES
# ------------------------------------------------------------------------------
TEMPLATES[0]["OPTIONS"]["loaders"] = [
    (
        "django.template.loaders.cached.Loader",
        [
            "django.template.loaders.filesystem.Loader",
            "django.template.loaders.app_directories.Loader",
        ],
    )
]

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#email-backend
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# STORAGES
# ------------------------------------------------------------------------------
# https://django-storages.readthedocs.io/en/latest/#installation
INSTALLED_APPS += ["storages"]  # noqa F405
# https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html#settings
AWS_S3_ENDPOINT_URL = env(
    "AWS_S3_ENDPOINT_URL", default="http://localhost:4566"  # localstack
)
AWS_ACCESS_KEY_ID = "dummy-aws-access-key"
AWS_SECRET_ACCESS_KEY = "dummy-aws-secret-key"
AWS_STORAGE_BUCKET_NAME = "macquette-storage"
AWS_QUERYSTRING_AUTH = True
AWS_LOCATION = "media"
# DO NOT change these unless you know what you're doing.
_AWS_EXPIRY = 60 * 60 * 24 * 7
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": f"max-age={_AWS_EXPIRY}, s-maxage={_AWS_EXPIRY}, must-revalidate"
}
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_EXPIRE = 4 * 60 * 60

# MEDIA
# ------------------------------------------------------------------------------

DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
