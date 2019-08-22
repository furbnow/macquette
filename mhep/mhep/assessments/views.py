from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status

from mhep.assessments.models import Assessment
from mhep.assessments.serializers import (
    AssessmentFullSerializer,
    AssessmentMetadataSerializer,
)


class ListCreateAssessments(
  generics.ListCreateAPIView
  ):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentMetadataSerializer


class RetrieveUpdateDestroyAssessment(
  generics.RetrieveUpdateDestroyAPIView,
  ):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentFullSerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response
