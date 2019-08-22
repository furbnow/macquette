
from django.urls import path

from mhep.assessments.views import (
    AssessmentDetail,
    ListCreateAssessments,
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
        view=AssessmentDetail.as_view(),
        name="assessment-detail"
    ),
]
