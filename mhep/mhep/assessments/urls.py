
from django.urls import path

from mhep.assessments.views import (
    AssessmentDetail,
    ListAssessments,
)

app_name = "assessments"
urlpatterns = [
    path("api/v1/assessments/", view=ListAssessments.as_view(), name="list"),
    path("api/v1/assessments/<int:pk>/", view=AssessmentDetail.as_view(), name="detail"),
]
