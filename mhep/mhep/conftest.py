import pytest
from django.conf import settings
from django.test import RequestFactory

from mhep.users.tests.factories import UserFactory, UserWithOrganisationFactory
from mhep.assessments.tests.factories import AssessmentFactory, LibraryFactory, OrganisationFactory
from mhep.assessments.models import Assessment, Library, Organisation


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


@pytest.fixture
def assessment() -> Assessment:
    return AssessmentFactory()


@pytest.fixture
def library() -> Library:
    return LibraryFactory()


@pytest.fixture
def organisation() -> Organisation:
    return OrganisationFactory()
