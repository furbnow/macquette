from django.db import models
from django.contrib.postgres.fields import JSONField

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

    data = JSONField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
