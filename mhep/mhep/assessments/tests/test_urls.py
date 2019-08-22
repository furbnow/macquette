import pytest
# from django.conf import settings
from django.urls import reverse, resolve

from mhep.assessments.models import Assessment

pytestmark = pytest.mark.django_db


def test_list_assessments(assessment: Assessment):
    assert (
        reverse("assessments:list") == f"/api/v1/assessments/"
    )
    assert resolve(f"/api/v1/assessments/").view_name == "assessments:list"


def test_assessment_detail(assessment: Assessment):
    assert (
        reverse("assessments:detail", kwargs={"pk": assessment.id})
        == f"/api/v1/assessments/{assessment.id}/"
    )
    assert resolve(f"/api/v1/assessments/{assessment.id}/").view_name == "assessments:detail"


@pytest.fixture
def assessment():
    return Assessment.objects.create(
        data={},
    )
