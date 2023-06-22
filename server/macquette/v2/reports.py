import math
import re

import pydantic
from jinja2 import DictLoader, Environment, pass_eval_context, select_autoescape
from markupsafe import Markup, escape
from rest_framework.exceptions import APIException
from weasyprint import HTML

from macquette import graphs


@pass_eval_context
def _nl2br(eval_ctx, value):
    split_paragraphs = re.split(r"(?:\r\n|\r(?!\n)|\n){2,}", str(value))
    processed_paragraphs = [
        Markup("<p>")
        + Markup("<br>\n").join([escape(line) for line in paragraph.splitlines()])
        + Markup("</p>")
        for paragraph in split_paragraphs
    ]
    return escape("\n\n").join(processed_paragraphs)


def _sqrt(value) -> float:
    return math.sqrt(value)


def _round_half_up(num: float) -> float:
    return math.floor(num * 10 + 0.5) / 10


def _to_hours_and_minutes(value: str) -> str:
    (minutes, hours) = math.modf(float(value))
    hours = int(hours)
    minutes = int(_round_half_up(minutes * 60))
    if hours == 0:
        return f"{minutes} minutes"
    elif minutes == 0:
        return f"{hours} hours"
    else:
        return f"{hours} hours {minutes} minutes"


def parse_template(template):
    """Parse and compile the provided template."""
    env = Environment(loader=DictLoader({}), autoescape=select_autoescape())
    env.filters["nl2br"] = _nl2br
    env.filters["sqrt"] = _sqrt
    env.filters["to_hours_and_minutes"] = _to_hours_and_minutes
    return env.from_string(template)


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

    template = parse_template(template)
    return template.render({"graphs": rendered_graphs, **context})


def render_to_pdf(html: str):
    return HTML(string=html, encoding="utf-8").write_pdf()
