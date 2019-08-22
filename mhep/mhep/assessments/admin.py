from django.contrib import admin

from mhep.assessments.models import Assessment, Library


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["name", "status"]
    search_fields = ["name", "description"]


@admin.register(Library)
class LibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "type"]
    search_fields = ["name", "type"]
