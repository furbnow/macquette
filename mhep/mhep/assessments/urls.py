
from django.urls import path

from mhep.assessments.views import (
    RetrieveUpdateDestroyAssessment,
    ListCreateAssessments,
    ListCreateLibraries,
    ListOrganisationAssessments,
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
        "api/v1/organisations/<int:pk>/assessments/",
        view=ListOrganisationAssessments.as_view(),
        name="list-organisation-assessments"
    ),
]
