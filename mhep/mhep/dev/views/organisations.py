from django.contrib.auth import get_user_model

from rest_framework import generics, exceptions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Assessment, Organisation
from ..permissions import (
    IsMemberOfOrganisation,
    IsAdminOfOrganisation,
)

from ..serializers import (
    AssessmentMetadataSerializer,
    LibrarySerializer,
    OrganisationSerializer,
    OrganisationLibrarianSerializer,
)

from .. import VERSION
from .exceptions import BadRequest

User = get_user_model()


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


class CreateDeleteOrganisationLibrarians(
    generics.UpdateAPIView,
):
    serializer_class = OrganisationLibrarianSerializer
    permission_classes = [
        IsAuthenticated,
        IsAdminOfOrganisation,
    ]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations")

    def _get_user(self, userid):
        try:
            return User.objects.get(id=userid)
        except User.DoesNotExist:
            raise exceptions.NotFound(detail=f"No such user: id={userid}")

    def post(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        if user not in org.members.all():
            raise BadRequest(detail=f"{user} is not a member of {org}")

        org.librarians.add(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        org.librarians.remove(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)
