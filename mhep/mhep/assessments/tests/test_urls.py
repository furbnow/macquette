import pytest
# from django.conf import settings
from django.urls import reverse, resolve

from mhep.assessments.models import Assessment, Library

pytestmark = pytest.mark.django_db


def test_list_create_assessments(assessment: Assessment):
    assert (
        reverse("assessments:list-create-assessments") == f"/api/v1/assessments/"
    )
    assert resolve(f"/api/v1/assessments/").view_name == "assessments:list-create-assessments"


def test_assessment_detail_update_destroy(assessment: Assessment):
    assert (
        reverse("assessments:retrieve-update-destroy-assessment", kwargs={"pk": assessment.id})
        == f"/api/v1/assessments/{assessment.id}/"
    )
    assert (
        resolve(f"/api/v1/assessments/{assessment.id}/").view_name
        == "assessments:retrieve-update-destroy-assessment"
    )


def test_list_create_libraries():
    assert (
        reverse("assessments:list-create-libraries") == f"/api/v1/libraries/"
    )
    assert resolve(f"/api/v1/libraries/").view_name == "assessments:list-create-libraries"


def test_update_library(library: Library):
    assert (
        reverse("assessments:update-library", kwargs={"pk": library.id})
        == f"/api/v1/libraries/{library.id}/"
    )
    assert (
        resolve(f"/api/v1/libraries/{library.id}/").view_name
        == "assessments:update-library"
    )


def test_list_organisations():
    assert (
        reverse("assessments:list-organisations") == f"/api/v1/organisations/"
    )
    assert (
        resolve("/api/v1/organisations/").view_name == "assessments:list-organisations"
    )


def test_list_create_organisation_assessments():
    assert (
        reverse("assessments:list-create-organisation-assessments", kwargs={"pk": 1})
        == f"/api/v1/organisations/1/assessments/"
    )
    assert (
        resolve(f"/api/v1/organisations/1/assessments/").view_name
        == "assessments:list-create-organisation-assessments"
    )


@pytest.fixture
def assessment():
    return Assessment.objects.create(
        data={},
    )


@pytest.fixture
def library():
    return Library.objects.create(
        data={},
    )
