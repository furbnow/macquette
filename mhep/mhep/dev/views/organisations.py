from rest_framework import generics, exceptions
from rest_framework.permissions import IsAuthenticated

from ..models import Assessment, Organisation
from ..permissions import (
    IsMemberOfOrganisation,
)
from ..serializers import (
    AssessmentMetadataSerializer,
)


from ..serializers import (
    OrganisationSerializer,
)

from .. import VERSION


class ListOrganisations(generics.ListAPIView):
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations").all()


class ListCreateOrganisationAssessments(generics.ListCreateAPIView):
    permission_classes = [
        IsAuthenticated,
        IsMemberOfOrganisation,
    ]
    serializer_class = AssessmentMetadataSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context["organisation"] = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")

        return context

    def get_queryset(self, **kwargs):
        try:
            return Assessment.objects.all().filter(
                organisation=Organisation.objects.get(id=self.kwargs["pk"])
            )
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
