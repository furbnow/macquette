from django.contrib.auth import get_user_model
from django.db import models

import mhep.organisations.models as org_models


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

    report_template = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
