import json
import logging

from django.db.models import Q
from rest_framework import exceptions
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .. import VERSION
from ..models import Library
from ..permissions import CanReadLibrary
from ..permissions import CanWriteLibrary
from ..permissions import IsReadRequest
from ..permissions import IsWriteRequest
from ..serializers import LibraryItemSerializer
from ..serializers import LibrarySerializer
from .exceptions import BadRequest
from .helpers import build_static_dictionary

STATIC_URLS = build_static_dictionary()


class MyLibrariesMixin:
    def my_libraries(self):
        user = self.request.user
        user_v_libraries = getattr(user, f"{VERSION}_libraries")
        user_v_organisations = getattr(user, f"{VERSION}_organisations")

        user_libraries = Q(id__in=user_v_libraries.values("id"))
        org_libraries = Q(owner_organisation__in=user_v_organisations.values("id"))
        shared_libraries = Q(shared_with__in=user_v_organisations.values("id"))
        global_libraries = Q(owner_user=None, owner_organisation=None)

        return (
            Library.objects.filter(
                user_libraries | global_libraries | shared_libraries | org_libraries
            )
            .distinct()
            .order_by("id")
        )


class ListCreateLibraries(MyLibrariesMixin, generics.ListCreateAPIView):

    serializer_class = LibrarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return self.my_libraries().prefetch_related(
            "owner_user",
            "owner_organisation",
            "owner_organisation__librarians",
            "owner_organisation__admins",
        )


class UpdateDestroyLibrary(
    MyLibrariesMixin, generics.UpdateAPIView, generics.DestroyAPIView
):
    serializer_class = LibrarySerializer
    permission_classes = [
        # IsAuthenticated will ensure we can filter (using get_queryset) based on User.libraries
        # (which is the reverse of Library.owner)
        IsAuthenticated,
        (IsReadRequest & CanReadLibrary) | (IsWriteRequest & CanWriteLibrary),
    ]

    def get_queryset(self, *args, **kwargs):
        return self.my_libraries()

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class CreateUpdateDeleteLibraryItem(MyLibrariesMixin, generics.GenericAPIView):
    serializer_class = LibraryItemSerializer
    permission_classes = [
        IsAuthenticated,
        (IsReadRequest & CanReadLibrary) | (IsWriteRequest & CanWriteLibrary),
    ]

    def get_queryset(self, *args, **kwargs):
        return self.my_libraries()

    def post(self, request, pk):
        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tag = serializer.validated_data["tag"]
        item = serializer.validated_data["item"]

        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag in d:
            logging.warning(f"tag {tag} already exists in library {library.id}")
            raise BadRequest(f"tag `{tag}` already exists in library {library.id}")

        d[tag] = item
        library.data = d
        library.save()
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, tag):
        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag not in d:
            raise exceptions.NotFound(f"tag `{tag}` not found in library {library.id}")

        del d[tag]
        library.data = d
        library.save()
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def put(self, request, pk, tag):
        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag not in d:
            raise exceptions.NotFound(f"tag `{tag}` not found in library {library.id}")

        d[tag] = request.data
        library.data = d
        library.save()
        return Response("", status=status.HTTP_204_NO_CONTENT)
