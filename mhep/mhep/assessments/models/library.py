from django.db import models
from django.contrib.postgres.fields import JSONField
from mhep.assessments.validators import validate_dict


class Library(models.Model):
    class Meta:
        verbose_name_plural = "libraries"

    name = models.TextField()
    type = models.TextField()
    data = JSONField(default=dict, validators=[validate_dict])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
