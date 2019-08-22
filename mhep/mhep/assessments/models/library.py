from django.db import models
from django.contrib.postgres.fields import JSONField


class Library(models.Model):
    class Meta:
        verbose_name_plural = "libraries"

    name = models.TextField()
    type = models.TextField()
    data = JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
