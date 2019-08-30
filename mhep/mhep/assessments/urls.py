
from django.urls import path

from mhep.assessments.views import (
    CreateLibraryItem,
    ListCreateAssessments,
    ListCreateLibraries,
    ListCreateOrganisationAssessments,
    ListCreateOrganisations,
    RetrieveUpdateDestroyAssessment,
    UpdateDestroyLibraryItem,
    UpdateDestroyLibrary,
)

app_name = "assessments"
urlpatterns = [
    path(
        "api/v1/assessments/",
        view=ListCreateAssessments.as_view(),
        name="list-create-assessments"
    ),
    path(
        "api/v1/assessments/<int:pk>/",
        view=RetrieveUpdateDestroyAssessment.as_view(),
        name="retrieve-update-destroy-assessment",
    ),

    path(
        "api/v1/libraries/",
        view=ListCreateLibraries.as_view(),
        name="list-create-libraries"
    ),

    path(
        "api/v1/libraries/<int:pk>/",
        view=UpdateDestroyLibrary.as_view(),
        name="update-destroy-library"
    ),

    path(
        "api/v1/organisations/",
        view=ListCreateOrganisations.as_view(),
        name="list-create-organisations"
    ),
    path(
        "api/v1/organisations/<int:pk>/assessments/",
        view=ListCreateOrganisationAssessments.as_view(),
        name="list-create-organisation-assessments"
    ),

    path(
        "api/v1/libraries/<int:pk>/items/",
        view=CreateLibraryItem.as_view(),
        name="create-library-item"
    ),

    path(
        "api/v1/libraries/<int:pk>/items/<str:tag>/",
        view=UpdateDestroyLibraryItem.as_view(),
        name="update-destroy-library-item"
    ),
]
