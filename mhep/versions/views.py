from typing import List
from typing import NamedTuple

from django.apps import apps
from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse
from django.views.generic.base import TemplateView


def _all_versions():
    for app_config in apps.get_app_configs():
        name = app_config.name
        if not name.startswith("mhep."):
            continue
        if settings.ENV == "production" and ("dev" in name):
            continue
        if not name.startswith("mhep.v"):
            continue

        yield app_config


class Version(NamedTuple):
    name: str
    index_url: str
    release_date: str


def _version_data(app_config) -> Version:
    version = app_config.verbose_name
    if version.startswith("Assessments v"):
        name = f"Version {version.split('v')[1]}"
    elif version.startswith("Assessments "):
        name = "Development"

    return Version(
        name=name,
        index_url=reverse(f"{app_config.label}:index"),
        release_date=app_config.release_date,
    )


def _displayable_versions() -> List[Version]:
    return [_version_data(version) for version in _all_versions()]


class ListVersionsView(LoginRequiredMixin, TemplateView):
    template_name = "versions/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context = {"app_list": _displayable_versions()}

        return context
