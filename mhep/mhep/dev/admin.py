from django.contrib import admin
from django.db import models
from django.forms import CheckboxSelectMultiple

from . import VERSION
from .models import Assessment, Image, Library, Organisation


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ["id", "created_at", "assessment", "note", "image"]


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "owner", "organisation"]
    search_fields = ["name", "description"]


@admin.register(Library)
class LibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "owner_user", "owner_organisation", "number_of_items"]
    search_fields = ["name", "type"]
    formfield_overrides = {
        models.ManyToManyField: {'widget': CheckboxSelectMultiple},
    }

    def number_of_items(self, obj):
        return len(obj.data)


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ["name", "number_of_assessments"]
    search_fields = ["name"]
    formfield_overrides = {
        models.ManyToManyField: {'widget': CheckboxSelectMultiple},
    }

    def number_of_assessments(self, obj):
        return obj.assessments.count()
