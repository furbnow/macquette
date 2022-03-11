import re

import pydantic
from jinja2 import DictLoader
from jinja2 import Environment
from jinja2 import pass_eval_context
from jinja2 import select_autoescape
from markupsafe import escape
from markupsafe import Markup
from rest_framework.exceptions import APIException
from weasyprint import HTML

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


def parse_template(template):
    """Compile HTML template to see if any syntax errors come up."""
    env = Environment(loader=DictLoader({}), autoescape=select_autoescape())
    env.filters["nl2br"] = nl2br
    template = env.from_string(template)


def render_template(template, context, graph_data):
    rendered_graphs = {}
    for name, data in graph_data.items():
        try:
            parsed = graphs.parse(data)
        except pydantic.ValidationError as exc:
            raise APIException(detail=f"Error parsing graph {name}: {exc}")

        try:
            fig, key = graphs.render(parsed)
        except Exception as exc:
            raise APIException(detail=f"Error rendering graph {name}: {exc}")

        rendered_graphs[name] = {
            "url": graphs.to_url(fig),
            "key": key,
        }

    env = Environment(loader=DictLoader({}), autoescape=select_autoescape())
    env.filters["nl2br"] = nl2br
    template = env.from_string(template)
    return template.render({"graphs": rendered_graphs, **context})


def render_to_pdf(html: str):
    return HTML(string=html, encoding="utf-8").write_pdf()
