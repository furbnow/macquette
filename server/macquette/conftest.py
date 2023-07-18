import boto3
import pytest
from django.conf import settings
from django.test import RequestFactory

from macquette.users import models as user_models
from macquette.users.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def media_storage(settings, tmpdir):
    settings.MEDIA_ROOT = tmpdir.strpath


@pytest.fixture()
def user() -> user_models.User:
    return UserFactory()


@pytest.fixture()
def request_factory() -> RequestFactory:
    return RequestFactory()


s3 = boto3.resource(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    endpoint_url=settings.AWS_S3_ENDPOINT_URL,
)


@pytest.fixture(scope="session", autouse=True)
def media_s3_bucket():
    if settings.DEFAULT_FILE_STORAGE == "storages.backends.s3boto3.S3Boto3Storage":
        # Initialise localstack S3 bucket
        s3.Bucket(settings.AWS_STORAGE_BUCKET_NAME).create()
