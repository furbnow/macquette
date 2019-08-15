from django.contrib import admin

from mhep.assessments.models import Assessment


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["name", "status"]
    search_fields = ["name", "description"]
