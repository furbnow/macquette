from rest_framework import generics, exceptions
from rest_framework.permissions import IsAuthenticated

from ..models import Assessment, Organisation
from ..permissions import (
    IsMemberOfOrganisation,
)
from ..serializers import (
    AssessmentMetadataSerializer,
    LibrarySerializer,
)


from ..serializers import (
    OrganisationSerializer,
)

from .. import VERSION


class AddURLOrganisationToSerializerContextMixin():
    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context["organisation"] = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")

        return context


class ListOrganisations(generics.ListAPIView):
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations").all()


class ListCreateOrganisationAssessments(
    AddURLOrganisationToSerializerContextMixin,
    generics.ListCreateAPIView,
):

    permission_classes = [
        IsAuthenticated,
        IsMemberOfOrganisation,
    ]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, **kwargs):
        try:
            return Assessment.objects.all().filter(
                organisation=Organisation.objects.get(id=self.kwargs["pk"])
            )
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")


class CreateOrganisationLibraries(
    AddURLOrganisationToSerializerContextMixin,
    generics.CreateAPIView,
):

    serializer_class = LibrarySerializer
    permission_classes = [
        IsAuthenticated,
        IsMemberOfOrganisation,
    ]

    def get_queryset(self, *args, **kwargs):
        org = self.get_object()

        return getattr(org, f"{VERSION}_libraries").all()
