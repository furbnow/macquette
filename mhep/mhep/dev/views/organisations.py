from django.contrib.auth import get_user_model

from rest_framework import generics, exceptions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Assessment, Library, Organisation
from ..permissions import (
    IsAdminOfOrganisation,
    IsMemberOfOrganisation,
    IsLibrarianOfOrganisation,
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
        IsLibrarianOfOrganisation,
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


class ShareUnshareOrganisationLibraries(
    generics.UpdateAPIView,  # UpdateAPIView acts on the Organisation model
):
    serializer_class = OrganisationLibrarianSerializer
    permission_classes = [
        IsAuthenticated,
        IsAdminOfOrganisation,
    ]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations")

    def _get_library(self, organisation, library_id):
        try:
            return organisation.libraries.get(id=library_id)
        except Library.DoesNotExist:
            raise exceptions.NotFound(
                detail=f"organisation doesn't have a library with id={library_id}"
            )

    def _get_other_organisation(self, other_org_id):
        try:
            return Organisation.objects.get(id=other_org_id)
        except Organisation.DoesNotExist:
            raise exceptions.NotFound(
                detail=f"can't share library with non-existent organisation: id=9999"
            )

    def post(self, request, pk, otherorgid, libraryid):
        share_from_org = self.get_object()  # performs permission checks for organisation
        share_to_org = self._get_other_organisation(otherorgid)
        library = self._get_library(share_from_org, libraryid)

        library.shared_with.add(share_to_org)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, otherorgid, libraryid):
        share_from_org = self.get_object()  # performs permission checks for organisation
        share_to_org = self._get_other_organisation(otherorgid)
        library = self._get_library(share_from_org, libraryid)

        library.shared_with.remove(share_to_org)
        return Response("", status=status.HTTP_204_NO_CONTENT)
