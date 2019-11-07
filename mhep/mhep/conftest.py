import pytest
from django.conf import settings
from django.test import RequestFactory

from mhep.users.tests.factories import UserFactory, UserWithOrganisationFactory


@pytest.fixture(autouse=True)
def media_storage(settings, tmpdir):
    settings.MEDIA_ROOT = tmpdir.strpath


@pytest.fixture
def user() -> settings.AUTH_USER_MODEL:
    return UserFactory()


@pytest.fixture
def user_with_org() -> settings.AUTH_USER_MODEL:
    return UserWithOrganisationFactory()


@pytest.fixture
def request_factory() -> RequestFactory:
    return RequestFactory()
