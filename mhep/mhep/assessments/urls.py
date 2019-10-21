from django.conf.urls import url
from django.urls import path
from django.views.generic import TemplateView

from mhep.assessments.views import (
    AssessmentHTMLView,
    CreateUpdateDeleteLibraryItem,
    ListAssessmentsHTMLView,
    ListCreateAssessments,
    ListCreateLibraries,
    ListCreateOrganisationAssessments,
    ListOrganisations,
    RetrieveUpdateDestroyAssessment,
    SubviewHTMLView,
    SubviewJavascriptView,
    UpdateDestroyLibrary,
)

app_name = "assessments"
urlpatterns = [
    path(
        "",
        ListAssessmentsHTMLView.as_view(),
        name="home",
    ),

    path(
        "js/library-helper/library-helper.html",
        TemplateView.as_view(template_name="assessments/js/library-helper/library-helper.html"),
        name="library-helper-html",
    ),

    path(
        "js/library-helper/library-helper-r1.js",
        TemplateView.as_view(
            template_name="assessments/js/library-helper/library-helper-r1.js",
            content_type="text/javascript",
        ),
        name="library-helper-r1-js",
    ),

    path(
        "assessments/<int:pk>/",
        AssessmentHTMLView.as_view(),
        name="view-assessment",
    ),

    path(
        "subview/<str:name>.html",
        SubviewHTMLView.as_view(),
        name="subview-html",
    ),

    path(
        "subview/<str:name>.js",
        SubviewJavascriptView.as_view(),
        name="subview-javascript",
    ),

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
        view=ListOrganisations.as_view(),
        name="list-organisations"
    ),
    path(
        "api/v1/organisations/<int:pk>/assessments/",
        view=ListCreateOrganisationAssessments.as_view(),
        name="list-create-organisation-assessments"
    ),

    path(
        "api/v1/libraries/<int:pk>/items/",
        view=CreateUpdateDeleteLibraryItem.as_view(),
        name="create-update-delete-library-item"
    ),

    path(
        "api/v1/libraries/<int:pk>/items/<str:tag>/",
        view=CreateUpdateDeleteLibraryItem.as_view(),
        name="create-update-delete-library-item"
    ),
]
