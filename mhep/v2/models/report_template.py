from django.db import models


class ReportTemplate(models.Model):
    """A report template that can be shared between organisations."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    name = models.TextField()
    template = models.TextField()

    def __str__(self):
        return f"{self.name} (#{self.id})"
