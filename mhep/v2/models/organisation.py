from django.contrib.auth import get_user_model
from django.db import models

import mhep.organisations.models as org_models

from ..validators import validate_dict

User = get_user_model()


class Organisation(models.Model):
    organisation = models.ForeignKey(
        to=org_models.Organisation,
        related_name="%(app_label)s_data",
        on_delete=models.deletion.PROTECT,
        null=True,
    )

    name = models.TextField()

    members = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations"
    )
    librarians = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations_where_librarian"
    )
    admins = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations_where_admin"
    )

    report = models.ForeignKey(
        to="ReportTemplate",
        related_name="%(app_label)s_organisations",
        on_delete=models.deletion.PROTECT,
        null=True,
        blank=True,
    )
    report_vars = models.JSONField(default=dict, validators=[validate_dict], blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
