from django.apps import AppConfig

from . import VERSION


class AssessmentsConfig(AppConfig):
    name = f"macquette.{VERSION}"
    verbose_name = f"Assessments {VERSION}"
    release_date = "November 2020"
