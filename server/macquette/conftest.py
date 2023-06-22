import pytest
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