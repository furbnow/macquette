import jinja2
from django.core.exceptions import ValidationError
from django.db import models

from ..reports import parse_template


def _validate_template(value):
    try:
        parse_template(value)
    except jinja2.TemplateSyntaxError as exc:
        raise ValidationError(
            f"Template syntax error: {exc.message} at line {exc.lineno}"
        )


class ReportTemplate(models.Model):
    """A report template that can be shared between organisations."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    name = models.TextField()
    template = models.TextField(validators=[_validate_template])

    def __str__(self):
        return f"{self.name} (#{self.id})"
