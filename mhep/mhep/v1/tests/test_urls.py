import pytest
# from django.conf import settings
from django.urls import reverse, resolve

from mhep.v1.models import Assessment, Library

pytestmark = pytest.mark.django_db


def test_assessments_home():
    assert (
        reverse("v1:home") == "/"
    )
    assert resolve("/").view_name == "v1:home"


def test_list_create_assessments(assessment: Assessment):
    assert (
        reverse("v1:list-create-assessments") == "/api/v1/assessments/"
    )
    assert resolve("/api/v1/assessments/").view_name == "v1:list-create-assessments"


def test_assessment_detail_update_destroy(assessment: Assessment):
    assert (
        reverse("v1:retrieve-update-destroy-assessment", kwargs={"pk": assessment.id})
        == f"/api/v1/assessments/{assessment.id}/"
    )
    assert (
        resolve(f"/api/v1/assessments/{assessment.id}/").view_name
        == "v1:retrieve-update-destroy-assessment"
    )


def test_list_create_libraries():
    assert (
        reverse("v1:list-create-libraries") == "/api/v1/libraries/"
    )
    assert resolve("/api/v1/libraries/").view_name == "v1:list-create-libraries"


def test_update_destroy_library(library: Library):
    assert (
        reverse("v1:update-destroy-library", kwargs={"pk": library.id})
        == f"/api/v1/libraries/{library.id}/"
    )
    assert (
        resolve(f"/api/v1/libraries/{library.id}/").view_name
        == "v1:update-destroy-library"
    )


def test_create_library_item(library: Library):
    assert (
        reverse("v1:create-update-delete-library-item", kwargs={"pk": library.id})
        == f"/api/v1/libraries/{library.id}/items/"
    )
    assert (
        resolve(f"/api/v1/libraries/{library.id}/items/").view_name
        == "v1:create-update-delete-library-item"
    )


def test_update_destroy_library_item(library: Library):
    tag = "SW_01"

    assert (
        reverse("v1:create-update-delete-library-item", kwargs={"pk": library.id, "tag": tag})
        == f"/api/v1/libraries/{library.id}/items/{tag}/"
    )
    assert (
        resolve(f"/api/v1/libraries/{library.id}/items/{tag}/").view_name
        == "v1:create-update-delete-library-item"
    )


def test_list_organisations():
    assert (
        reverse("v1:list-organisations") == "/api/v1/organisations/"
    )
    assert (
        resolve("/api/v1/organisations/").view_name == "v1:list-organisations"
    )


def test_list_create_organisation_assessments():
    assert (
        reverse("v1:list-create-organisation-assessments", kwargs={"pk": 1})
        == "/api/v1/organisations/1/assessments/"
    )
    assert (
        resolve("/api/v1/organisations/1/assessments/").view_name
        == "v1:list-create-organisation-assessments"
    )
