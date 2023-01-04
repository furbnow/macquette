import logging

from django.http import HttpResponse
from jinja2.exceptions import TemplateAssertionError
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..models import Organisation
from ..permissions import IsMemberOfOrganisation
from ..reports import render_template, render_to_pdf


class GenerateReport(APIView):
    permission_classes = [IsAuthenticated, IsMemberOfOrganisation]

    class InputSerializer(serializers.Serializer):
        filename = serializers.CharField(required=False, default="report")
        preview = serializers.BooleanField(required=False, default=False)
        context = serializers.JSONField(allow_null=True)
        graphs = serializers.JSONField(allow_null=True)

    def post(self, request, pk):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        filename = serializer.data["filename"]
        if not filename.isascii():
            raise APIException(detail="Filename contains non-ASCII characters")
        if not filename.isprintable():
            raise APIException(detail="Filename contains nonprintable characters")

        organisation = Organisation.objects.get(pk=pk)

        try:
            html = render_template(
                organisation.report.template,
                {
                    "org": {
                        "name": organisation.name,
                        **organisation.report_vars,
                    },
                    **serializer.data["context"],
                },
                serializer.data["graphs"],
            )
        except TemplateAssertionError as exc:
            logging.exception("Error rendering report template")
            raise APIException(detail=str(exc))

        if serializer.data["preview"]:
            response = HttpResponse(status=200, content_type="text/html")
            response.write(html)
        else:
            pdf = render_to_pdf(html)

            response = HttpResponse(status=200, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
            response["Content-Transfer-Encoding"] = "binary"
            response.write(pdf)

        return response
