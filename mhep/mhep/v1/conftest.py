import pytest

from mhep.v1.tests.factories import (
    AssessmentFactory,
    LibraryFactory,
    OrganisationFactory,
    OrganisationWithExtrasFactory,
)
from mhep.v1.models import Assessment, Library, Organisation


@pytest.fixture
def assessment() -> Assessment:
    return AssessmentFactory()


@pytest.fixture
def library() -> Library:
    return LibraryFactory()


@pytest.fixture
def organisation() -> Organisation:
    return OrganisationFactory()


@pytest.fixture
def organisation_with_extras() -> Organisation:
    return OrganisationWithExtrasFactory()
