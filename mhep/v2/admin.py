from django.contrib import admin
from django.db import models
from django.forms import CheckboxSelectMultiple

from .models import Assessment, Image, Library, Organisation, ReportTemplate


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ["id", "created_at", "assessment", "note", "image"]


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ["id", "name"]


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "status", "updated_at", "organisation", "owner"]
    list_filter = ["organisation", "status", "owner", "updated_at"]
    search_fields = ["name", "description"]


@admin.register(Library)
class LibraryAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "type",
        "owner_user",
        "owner_organisation",
        "number_of_items",
        "updated_at",
    ]
    search_fields = ["name", "type"]
    formfield_overrides = {models.ManyToManyField: {"widget": CheckboxSelectMultiple}}

    def number_of_items(self, obj):
        return len(obj.data)


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "number_of_assessments",
        "number_of_members",
        "_librarians",
        "_admins",
    ]
    search_fields = ["name"]
    formfield_overrides = {models.ManyToManyField: {"widget": CheckboxSelectMultiple}}

    def number_of_assessments(self, obj):
        return obj.assessments.count()

    def number_of_members(self, obj):
        return obj.members.count()

    def _librarians(self, obj):
        return ", ".join(tuple(obj.librarians.values_list("name", flat=True)))

    def _admins(self, obj):
        return ", ".join(tuple(obj.admins.values_list("name", flat=True)))
