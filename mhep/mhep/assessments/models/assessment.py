from django.db import models
from django.contrib.postgres.fields import JSONField
from mhep.assessments.validators import validate_dict

STATUS_CHOICES = [
        ('Complete', 'Complete'),
        ('In progress', 'In progress'),
        ('Test', 'Test'),
]

OPENBEM_VERSION_CHOICES = [
        ('10.1.0', 'v10.1.0'),
        ('10.1.1', 'v10.1.1'),
]


class Assessment(models.Model):
    name = models.TextField()
    description = models.TextField(blank=True)

    openbem_version = models.CharField(
        max_length=20,
        choices=OPENBEM_VERSION_CHOICES,
        )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='In progress',
    )

    data = JSONField(default=dict, validators=[validate_dict])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
