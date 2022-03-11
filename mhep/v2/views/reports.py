import logging
import re

import pydantic
from django.http import HttpResponse
from jinja2 import DictLoader
from jinja2 import Environment
from jinja2 import pass_eval_context
from jinja2 import select_autoescape
from jinja2.exceptions import TemplateAssertionError
from markupsafe import escape
from markupsafe import Markup
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from weasyprint import HTML

from ..models import Organisation
from ..permissions import IsMemberOfOrganisation
from mhep import graphs


@pass_eval_context
def nl2br(eval_ctx, value):
    br = "<br>\n"

    if eval_ctx.autoescape:
        value = escape(value)
        br = Markup(br)

    result = "\n\n".join(
        f"<p>{br.join(p.splitlines())}</p>"
        for p in re.split(r"(?:\r\n|\r(?!\n)|\n){2,}", value)
    )
    return Markup(result) if eval_ctx.autoescape else result


def generate_html(template, context, graph_data):
    rendered_graphs = {}
    for name, data in graph_data.items():
        try:
            parsed = graphs.parse(data)
        except pydantic.ValidationError as exc:
            raise APIException(detail=f"Error parsing figure {name}: {exc}")

        fig, key = graphs.render(parsed)
        rendered_graphs[name] = {
            "url": graphs.to_url(fig),
            "key": key,
        }

    env = Environment(loader=DictLoader({}), autoescape=select_autoescape())
    env.filters["nl2br"] = nl2br
    template = env.from_string(template)
    return template.render({"graphs": rendered_graphs, **context})


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
            html = generate_html(
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
            pdf = HTML(string=html, encoding="utf-8").write_pdf()

            response = HttpResponse(status=200, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="{filename}.pdf"'
            response["Content-Transfer-Encoding"] = "binary"
            response.write(pdf)

        return response
