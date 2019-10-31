import pytest
# from django.conf import settings
from django.urls import reverse, resolve

from ..models import Assessment, Library

pytestmark = pytest.mark.django_db


def test_assessments_home():
    assert (
        reverse("v1:list-assessments") == "/v1/"
    )
    assert resolve("/v1/").view_name == "v1:list-assessments"


def test_list_create_assessments(assessment: Assessment):
    assert (
        reverse("v1:list-create-assessments") == "/v1/api/assessments/"
    )
    assert resolve("/v1/api/assessments/").view_name == "v1:list-create-assessments"


def test_assessment_detail_update_destroy(assessment: Assessment):
    assert (
        reverse("v1:retrieve-update-destroy-assessment", kwargs={"pk": assessment.id})
        == f"/v1/api/assessments/{assessment.id}/"
    )
    assert (
        resolve(f"/v1/api/assessments/{assessment.id}/").view_name
        == "v1:retrieve-update-destroy-assessment"
    )


def test_list_create_libraries():
    assert (
        reverse("v1:list-create-libraries") == "/v1/api/libraries/"
    )
    assert resolve("/v1/api/libraries/").view_name == "v1:list-create-libraries"


def test_update_destroy_library(library: Library):
    assert (
        reverse("v1:update-destroy-library", kwargs={"pk": library.id})
        == f"/v1/api/libraries/{library.id}/"
    )
    assert (
        resolve(f"/v1/api/libraries/{library.id}/").view_name
        == "v1:update-destroy-library"
    )


def test_create_library_item(library: Library):
    assert (
        reverse("v1:create-update-delete-library-item", kwargs={"pk": library.id})
        == f"/v1/api/libraries/{library.id}/items/"
    )
    assert (
        resolve(f"/v1/api/libraries/{library.id}/items/").view_name
        == "v1:create-update-delete-library-item"
    )


def test_update_destroy_library_item(library: Library):
    tag = "SW_01"

    assert (
        reverse("v1:create-update-delete-library-item", kwargs={"pk": library.id, "tag": tag})
        == f"/v1/api/libraries/{library.id}/items/{tag}/"
    )
    assert (
        resolve(f"/v1/api/libraries/{library.id}/items/{tag}/").view_name
        == "v1:create-update-delete-library-item"
    )


def test_list_organisations():
    assert (
        reverse("v1:list-organisations") == "/v1/api/organisations/"
    )
    assert (
        resolve("/v1/api/organisations/").view_name == "v1:list-organisations"
    )


def test_list_create_organisation_assessments():
    assert (
        reverse("v1:list-create-organisation-assessments", kwargs={"pk": 1})
        == "/v1/api/organisations/1/assessments/"
    )
    assert (
        resolve("/v1/api/organisations/1/assessments/").view_name
        == "v1:list-create-organisation-assessments"
    )
