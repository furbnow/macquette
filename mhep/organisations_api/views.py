from django.contrib.auth import get_user_model
from rest_framework import exceptions
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import serializers
from .exceptions import BadRequest
from .permissions import CanAddRemoveMembers
from .permissions import CanListOrganisations
from .permissions import CanListUsers
from .permissions import CanPromoteDemoteLibrarians


User = get_user_model()


class ListUsers(generics.ListAPIView):
    serializer_class = serializers.UserSerializer
    permission_classes = [IsAuthenticated, CanListUsers]

    def get_queryset(self, *args, **kwargs):
        return User.objects.all()


class ListOrganisations(generics.ListAPIView):
    serializer_class = serializers.OrganisationSerializer
    permission_classes = [IsAuthenticated, CanListOrganisations]

    def get_queryset(self, *args, **kwargs):
        return self.request.user.organisations.all()


class CreateDeleteOrganisationMembers(generics.UpdateAPIView):
    serializer_class = serializers.OrganisationMemberSerializer
    permission_classes = [IsAuthenticated, CanAddRemoveMembers]

    def get_queryset(self, *args, **kwargs):
        return self.request.user.organisations.all()

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


class CreateDeleteOrganisationLibrarians(generics.UpdateAPIView):
    serializer_class = serializers.OrganisationLibrarianSerializer
    permission_classes = [IsAuthenticated, CanPromoteDemoteLibrarians]

    def get_queryset(self, *args, **kwargs):
        return self.request.user.organisations

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
