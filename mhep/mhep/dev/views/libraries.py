import json
import logging

from rest_framework import generics, exceptions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .. import VERSION

from ..permissions import (
    IsLibraryOwner,
)
from ..serializers import (
    LibraryItemSerializer,
    LibrarySerializer,
)

from .helpers import build_static_dictionary

STATIC_URLS = build_static_dictionary()


class BadRequest(exceptions.APIException):
    status_code = status.HTTP_400_BAD_REQUEST


class ListCreateLibraries(generics.ListCreateAPIView):
    serializer_class = LibrarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        user_libraries = getattr(self.request.user, f"{VERSION}_libraries").all()
        user_orgs = getattr(self.request.user, f"{VERSION}_organisations").all()

        all_libraries = user_libraries

        for org in user_orgs:
            org_libraries = org.libraries.all()
            all_libraries |= org_libraries

        return all_libraries


class UpdateDestroyLibrary(
    generics.UpdateAPIView,
    generics.DestroyAPIView,
):
    serializer_class = LibrarySerializer
    permission_classes = [
        # IsAuthenticated will ensure we can filter (using get_queryset) based on User.libraries
        # (which is the reverse of Library.owner)
        IsAuthenticated,
        IsLibraryOwner,
    ]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_libraries").all()

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class CreateUpdateDeleteLibraryItem(
    generics.GenericAPIView,
):
    serializer_class = LibraryItemSerializer
    permission_classes = [
        IsAuthenticated,
        IsLibraryOwner,
    ]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_libraries").all()

    def post(self, request, pk):
        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tag = serializer.validated_data['tag']
        item = serializer.validated_data['item']

        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag in d:
            logging.warning(f"tag {tag} already exists in library {library.id}")
            raise BadRequest(
                    f"tag `{tag}` already exists in library {library.id}",
            )

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
