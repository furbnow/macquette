from rest_framework import generics, mixins

from mhep.assessments.models import Assessment
from mhep.assessments.serializers import (
    AssessmentFullSerializer,
    AssessmentMetadataSerializer,
)


class ListAssessments(generics.ListAPIView, mixins.ListModelMixin):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentMetadataSerializer


class GetAssessment(generics.RetrieveAPIView, mixins.RetrieveModelMixin):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentFullSerializer
