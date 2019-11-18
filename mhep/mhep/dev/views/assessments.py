import json
import logging

from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework import generics, exceptions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Assessment, Organisation
from ..permissions import (
    IsMemberOfConnectedOrganisation,
    IsMemberOfOrganisation,
    IsAssessmentOwner,
)
from ..serializers import (
    AssessmentFullSerializer,
    AssessmentMetadataSerializer,
)

from .mixins import AssessmentQuerySetMixin


class ListCreateAssessments(
    generics.ListCreateAPIView
):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, *args, **kwargs):
        return Assessment.objects.all().filter(owner=self.request.user)


class RetrieveUpdateDestroyAssessment(
    AssessmentQuerySetMixin,
    generics.RetrieveUpdateDestroyAPIView,
):
    serializer_class = AssessmentFullSerializer
    permission_classes = [
        IsAuthenticated,
        IsAssessmentOwner | IsMemberOfConnectedOrganisation,
    ]

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if "data" in request.data and obj.status == "Complete":
            return Response(
                {"detail": "can't update data when status is 'complete'"},
                status.HTTP_400_BAD_REQUEST
            )

        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response
