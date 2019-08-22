import pytest
# from django.conf import settings
from django.urls import reverse, resolve

from mhep.assessments.models import Assessment

pytestmark = pytest.mark.django_db


def test_list_create_assessments(assessment: Assessment):
    assert (
        reverse("assessments:list-create-assessments") == f"/api/v1/assessments/"
    )
    assert resolve(f"/api/v1/assessments/").view_name == "assessments:list-create-assessments"


def test_assessment_detail(assessment: Assessment):
    assert (
        reverse("assessments:assessment-detail", kwargs={"pk": assessment.id})
        == f"/api/v1/assessments/{assessment.id}/"
    )
    assert (
        resolve(f"/api/v1/assessments/{assessment.id}/").view_name
        == "assessments:assessment-detail"
    )


@pytest.fixture
def assessment():
    return Assessment.objects.create(
        data={},
    )
