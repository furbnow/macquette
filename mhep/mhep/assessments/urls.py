
from django.urls import path

from mhep.assessments.views import (
    GetAssessment,
    ListAssessments,
)

app_name = "assessments"
urlpatterns = [
    path("api/v1/assessments/", view=ListAssessments.as_view(), name="list-assessments"),
    path("api/v1/assessments/<int:pk>/", view=GetAssessment.as_view(), name="get-assessment"),
]
