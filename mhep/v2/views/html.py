import json

from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import DetailView
from django.views.generic.base import TemplateView
from waffle import get_waffle_flag_model
from waffle.models import Sample
from waffle.models import Switch

from .. import VERSION
from ..models import Assessment
from .helpers import build_static_dictionary
from .mixins import AssessmentQuerySetMixin

STATIC_URLS = build_static_dictionary()


def _waffle_features(request) -> list[str]:
    """Get a list of enabled feature flags from Waffle."""
    flags = get_waffle_flag_model().get_all()
    flag_values = [f.name for f in flags if f.is_active(request)]

    switches = Switch.get_all()
    switch_values = [s.name for s in switches if s.is_active()]

    samples = Sample.get_all()
    sample_values = [s.name for s in samples if s.is_active()]

    return [*flag_values, *switch_values, *sample_values]


class CommonContextMixin:
    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context["VERSION"] = VERSION
        context["appname"] = settings.APP_NAME
        context["static_urls"] = json.dumps(STATIC_URLS, indent=4)
        context["features"] = _waffle_features(self.request)

        return context


class AssessmentHTMLView(
    CommonContextMixin, AssessmentQuerySetMixin, LoginRequiredMixin, DetailView
):
    template_name = f"{VERSION}/view.html"
    context_object_name = "assessment"
    model = Assessment

    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)

        locked = object.status == "Completed"

        context["locked_javascript"] = json.dumps(locked)
        context["reports_javascript"] = json.dumps([])
        return context


class ListAssessmentsHTMLView(CommonContextMixin, LoginRequiredMixin, TemplateView):
    template_name = f"{VERSION}/assessments.html"
