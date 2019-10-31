import pytest

from mhep.v1.models import Organisation

pytestmark = pytest.mark.django_db


def test_organisation_assessments(organisation_with_extras: Organisation):
    assert organisation_with_extras.assessments.all().count() == 1
