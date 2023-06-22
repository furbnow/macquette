from django.urls import path, reverse_lazy
from django.views.generic.base import RedirectView

from . import VERSION
from .views import dashboards
from .views.assessments import (
    DuplicateAssessment,
    ListCreateAssessments,
    RetrieveUpdateDestroyAssessment,
    SetFeaturedImage,
    ShareUnshareAssessment,
    UploadAssessmentImage,
)
from .views.html import AssessmentHTMLView, ListAssessmentsHTMLView
from .views.images import UpdateDestroyImage
from .views.libraries import (
    CreateUpdateDeleteLibraryItem,
    ListCreateLibraries,
    UpdateDestroyLibrary,
)
from .views.organisations import (
    CreateDeleteOrganisationLibrarians,
    CreateDeleteOrganisationMembers,
    CreateOrganisationLibraries,
    InviteOrganisationMembers,
    ListCreateOrganisationAssessments,
    ListOrganisationLibraryShares,
    ListOrganisations,
    ShareUnshareOrganisationLibraries,
)
from .views.reports import GenerateReport
from .views.users import ListUsers

app_name = "assessments"
urlpatterns = [
    path(
        "",
        RedirectView.as_view(url=reverse_lazy(f"{VERSION}:list-assessments")),
        name="index",
    ),
    path("dashboard/", dashboards.Dashboard.as_view(), name="dashboard"),
    path("assessments/", ListAssessmentsHTMLView.as_view(), name="list-assessments"),
    path("assessments/<int:pk>/", AssessmentHTMLView.as_view(), name="view-assessment"),
    path(
        "api/assessments/",
        view=ListCreateAssessments.as_view(),
        name="list-create-assessments",
    ),
    path(
        "api/assessments/<int:pk>/",
        view=RetrieveUpdateDestroyAssessment.as_view(),
        name="retrieve-update-destroy-assessment",
    ),
    path(
        "api/assessments/<int:pk>/duplicate/",
        view=DuplicateAssessment.as_view(),
        name="duplicate-assessment",
    ),
    path(
        "api/assessments/<int:pk>/shares/<int:userid>/",
        view=ShareUnshareAssessment.as_view(),
        name="share-unshare-assessment",
    ),
    path(
        "api/assessments/<int:pk>/images/featured/",
        view=SetFeaturedImage.as_view(),
        name="set-featured-image",
    ),
    path(
        "api/assessments/<int:pk>/images/",
        view=UploadAssessmentImage.as_view(),
        name="upload-image-to-assessment",
    ),
    path("api/images/<int:pk>/", view=UpdateDestroyImage.as_view(), name="image"),
    path(
        "api/libraries/",
        view=ListCreateLibraries.as_view(),
        name="list-create-libraries",
    ),
    path(
        "api/libraries/<int:pk>/",
        view=UpdateDestroyLibrary.as_view(),
        name="update-destroy-library",
    ),
    path(
        "api/organisations/",
        view=ListOrganisations.as_view(),
        name="list-organisations",
    ),
    path("api/users/", view=ListUsers.as_view(), name="list-users"),
    path(
        "api/organisations/<int:pk>/assessments/",
        view=ListCreateOrganisationAssessments.as_view(),
        name="list-create-organisation-assessments",
    ),
    path(
        "api/organisations/<int:pk>/libraries/",
        view=CreateOrganisationLibraries.as_view(),
        name="create-organisation-libraries",
    ),
    path(
        "api/organisations/<int:pk>/librarians/<int:userid>/",
        view=CreateDeleteOrganisationLibrarians.as_view(),
        name="create-delete-organisation-librarians",
    ),
    path(
        "api/organisations/<int:pk>/libraries/<int:libraryid>/shares/<int:otherorgid>/",
        view=ShareUnshareOrganisationLibraries.as_view(),
        name="share-unshare-organisation-libraries",
    ),
    path(
        "api/organisations/<int:pk>/libraries/<int:libraryid>/shares/",
        view=ListOrganisationLibraryShares.as_view(),
        name="list-organisation-library-shares",
    ),
    path(
        "api/organisations/<int:pk>/members/",
        view=InviteOrganisationMembers.as_view(),
        name="create-delete-organisation-members",
    ),
    path(
        "api/organisations/<int:pk>/members/<int:userid>/",
        view=CreateDeleteOrganisationMembers.as_view(),
        name="create-delete-organisation-members",
    ),
    path(
        "api/organisations/<int:pk>/report/",
        view=GenerateReport.as_view(),
        name="generate-report",
    ),
    path(
        "api/libraries/<int:pk>/items/",
        view=CreateUpdateDeleteLibraryItem.as_view(),
        name="create-update-delete-library-item",
    ),
    path(
        "api/libraries/<int:pk>/items/<str:tag>/",
        view=CreateUpdateDeleteLibraryItem.as_view(),
        name="create-update-delete-library-item",
    ),
]
