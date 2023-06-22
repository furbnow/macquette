import pytest

from . import VERSION
from .models import Assessment, Library, Organisation
from .tests.factories import (
    AssessmentFactory,
    LibraryFactory,
    OrganisationFactory,
    OrganisationWithExtrasFactory,
)

pytest.register_assert_rewrite(f"mhep.{VERSION}.tests.views.mixins.assert_error")


@pytest.fixture()
def assessment() -> Assessment:
    return AssessmentFactory()


@pytest.fixture()
def library() -> Library:
    return LibraryFactory()


@pytest.fixture()
def organisation() -> Organisation:
    return OrganisationFactory()


@pytest.fixture()
def organisation_with_extras() -> Organisation:
    return OrganisationWithExtrasFactory()
