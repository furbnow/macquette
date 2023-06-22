from django.contrib.auth import get_user_model
from rest_framework import exceptions, generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from macquette.users import services as user_services

from .. import VERSION
from ..models import Assessment, Library, Organisation
from ..permissions import (
    IsAdminOfOrganisation,
    IsLibrarianOfOrganisation,
    IsMemberOfOrganisation,
)
from ..serializers import (
    AssessmentMetadataSerializer,
    LibrarySerializer,
    OrganisationInviteSerializer,
    OrganisationLibrarianSerializer,
    OrganisationMemberSerializer,
    OrganisationMetadataSerializer,
    OrganisationSerializer,
)
from .exceptions import BadRequest

User = get_user_model()


class AddURLOrganisationToSerializerContextMixin:
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
        return (
            getattr(self.request.user, f"{VERSION}_organisations")
            .prefetch_related("admins", "librarians")
            .order_by("id")
        )


class ListCreateOrganisationAssessments(
    AddURLOrganisationToSerializerContextMixin, generics.ListCreateAPIView
):
    permission_classes = [IsAuthenticated, IsMemberOfOrganisation]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, **kwargs):
        try:
            organisation = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")

        all_for_org = (
            Assessment.objects.filter(organisation=organisation)
            .prefetch_related("owner", "organisation")
            .defer("data")
        )

        if self.request.user in organisation.admins.all():
            return all_for_org
        else:
            return all_for_org.filter(owner=self.request.user)

    class InputSerializer(serializers.Serializer):
        name = serializers.CharField()
        description = serializers.CharField(allow_blank=True, required=False)
        # SAFETY: this field shadows a property of the same name but with a
        # different type. This is fine at runtime but not in typechecking (yet).
        data = serializers.JSONField(allow_null=True, default=dict)  # type: ignore[assignment]

    def post(self, request, *args, **kwargs):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assessment = Assessment.objects.create(
            **serializer.data,
            owner=request.user,
            organisation_id=self.kwargs["pk"],
        )

        result = AssessmentMetadataSerializer(assessment)
        return Response(result.data, status=status.HTTP_201_CREATED)


class CreateOrganisationLibraries(
    AddURLOrganisationToSerializerContextMixin, generics.CreateAPIView
):
    serializer_class = LibrarySerializer
    permission_classes = [IsAuthenticated, IsLibrarianOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        org = self.get_object()

        return getattr(org, f"{VERSION}_libraries").all()


class CreateDeleteOrganisationLibrarians(generics.UpdateAPIView):
    serializer_class = OrganisationLibrarianSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

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


class InviteOrganisationMembers(APIView):
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def post(self, request, pk):
        org = Organisation.objects.get(id=self.kwargs["pk"])

        serializer = OrganisationInviteSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        for row in serializer.data:
            try:
                user = User.objects.get(email=row["email"])
            except User.DoesNotExist:
                user = user_services.create_user(row["name"], row["email"])

            org.members.add(user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class CreateDeleteOrganisationMembers(generics.UpdateAPIView):
    serializer_class = OrganisationMemberSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

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

        org.members.add(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        org.admins.remove(user)
        org.librarians.remove(user)

        org.members.remove(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)


class GetOrganisationLibraryMixin:
    def _get_organisation_library(self, organisation, library_id):
        """
        returns a library matching `library_id` that is also owned by `organisation`
        """
        try:
            return organisation.libraries.get(id=library_id)
        except Library.DoesNotExist:
            raise exceptions.NotFound(
                detail=f"organisation doesn't have a library with id={library_id}"
            )


class ShareUnshareOrganisationLibraries(
    GetOrganisationLibraryMixin,
    generics.UpdateAPIView,  # UpdateAPIView acts on the Organisation model
):
    serializer_class = OrganisationLibrarianSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations")

    def _get_other_organisation(self, other_org_id):
        try:
            return Organisation.objects.get(id=other_org_id)
        except Organisation.DoesNotExist:
            raise exceptions.NotFound(
                detail="can't share library with non-existent organisation: id=9999"
            )

    def post(self, request, pk, otherorgid, libraryid):
        share_from_org = (
            self.get_object()
        )  # performs permission checks for organisation
        share_to_org = self._get_other_organisation(otherorgid)
        library = self._get_organisation_library(share_from_org, libraryid)

        library.shared_with.add(share_to_org)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, otherorgid, libraryid):
        share_from_org = (
            self.get_object()
        )  # performs permission checks for organisation
        share_to_org = self._get_other_organisation(otherorgid)
        library = self._get_organisation_library(share_from_org, libraryid)

        library.shared_with.remove(share_to_org)
        return Response("", status=status.HTTP_204_NO_CONTENT)


class ListOrganisationLibraryShares(GetOrganisationLibraryMixin, generics.ListAPIView):
    """
    for a given organisation library, this list the other organisations that this library is
    shared with
    """

    serializer_class = OrganisationMetadataSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        """
        look up the organisation library, and return the organisations that it's shared with
        """
        try:
            shared_from_org = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound(
                detail="can't list shares for non-existent organisation: id=9999"
            )

        library = self._get_organisation_library(
            shared_from_org, self.kwargs["libraryid"]
        )
        return library.shared_with.all()
