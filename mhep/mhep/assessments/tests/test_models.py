import pytest

from mhep.assessments.models import Organisation

pytestmark = pytest.mark.django_db


def test_organisation_assessments(organisation: Organisation):
    assert organisation.assessments.all().count() == 1
