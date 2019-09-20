import json
import logging

from django.views.generic import DetailView
from django.views.generic.base import TemplateView

from rest_framework import generics, exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from mhep.assessments.models import Assessment, Library
from mhep.assessments.serializers import (
    AssessmentFullSerializer,
    AssessmentMetadataSerializer,
    LibraryItemSerializer,
    LibrarySerializer,
)


class BadRequest(exceptions.APIException):
    status_code = status.HTTP_400_BAD_REQUEST


class AssessmentHTMLView(DetailView):
    template_name = "assessments/view.html"
    context_object_name = "assessment"
    model = Assessment

    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)

        locked = object.status == "Completed"

        context["locked_javascript"] = json.dumps(locked)
        context["reports_javascript"] = json.dumps([])
        context["use_image_gallery"] = False
        return context


class SubviewHTMLView(TemplateView):
    def get_template_names(self, *kwargs):
        view_name = self.kwargs['name']

        return "assessments/subviews/" + view_name + ".html"


class SubviewJavascriptView(TemplateView):
    def get_template_names(self, *kwargs):
        view_name = self.kwargs['name']

        return "assessments/subviews/" + view_name + ".js"


class ListCreateAssessments(
    generics.ListCreateAPIView
):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentMetadataSerializer


class RetrieveUpdateDestroyAssessment(
    generics.RetrieveUpdateDestroyAPIView,
):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentFullSerializer

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


class ListCreateLibraries(generics.ListCreateAPIView):
    queryset = Library.objects.all()
    serializer_class = LibrarySerializer


class UpdateDestroyLibrary(
    generics.UpdateAPIView,
    generics.DestroyAPIView,
):
    queryset = Library.objects.all()
    serializer_class = LibrarySerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class ListCreateOrganisations(APIView):
    def get(self, request, *args, **kwargs):
        return Response([
            {
                "id": "1",
                "name": "Carbon Coop",
                "assessments": 0,
                "members": [
                    {
                        "userid": "1",
                        "name": "localadmin",
                        "lastactive": "?"
                    }
                ]
            }
        ], status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": "function not implemented"},
            status.HTTP_400_BAD_REQUEST
        )


class CreateLibraryItem(
    generics.GenericAPIView,
):
    serializer_class = LibraryItemSerializer

    def post(self, request, pk):
        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tag = serializer.validated_data['tag']
        item = serializer.validated_data['item']

        library = Library.objects.get(id=pk)

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


class UpdateDestroyLibraryItem(
    generics.GenericAPIView,
):
    serializer_class = LibraryItemSerializer

    def delete(self, request, pk, tag):
        library = Library.objects.get(id=pk)

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
        library = Library.objects.get(id=pk)

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


class ListCreateOrganisationAssessments(generics.ListCreateAPIView):
    def get(self, request, *args, **kwargs):
        return Response([], status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        return Response(None, status.HTTP_400_BAD_REQUEST)
