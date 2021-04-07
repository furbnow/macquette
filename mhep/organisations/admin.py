from django.contrib import admin
from django.db import models
from django.forms import CheckboxSelectMultiple

from .models import Organisation


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ["name", "number_of_members", "_librarians", "_admins"]
    search_fields = ["name"]
    formfield_overrides = {models.ManyToManyField: {"widget": CheckboxSelectMultiple}}

    def number_of_members(self, obj):
        return obj.members.count()

    def _librarians(self, obj):
        return ", ".join(tuple(obj.librarians.values_list("name", flat=True)))

    def _admins(self, obj):
        return ", ".join(tuple(obj.admins.values_list("name", flat=True)))
