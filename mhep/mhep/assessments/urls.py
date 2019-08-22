
from django.urls import path

from mhep.assessments.views import (
    RetrieveUpdateAssessment,
    ListCreateAssessments,
)

app_name = "assessments"
urlpatterns = [
<<<<<<< HEAD
    path(
        "api/v1/assessments/",
        view=ListCreateAssessments.as_view(),
        name="list-create-assessments"
    ),
    path(
        "api/v1/assessments/<int:pk>/",
        view=RetrieveUpdateAssessment.as_view(),
        name="retrieve-update-assessment",
    ),
]
