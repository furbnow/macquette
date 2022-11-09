from datetime import datetime
from datetime import timedelta

from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import Count
from django.db.models import F
from django.db.models.functions import ExtractDay
from django.db.models.functions import TruncMonth
from django.db.models.functions import TruncYear
from django.views.generic.base import TemplateView

from .. import VERSION
from mhep.v2.models.assessment import Assessment


class Dashboard(UserPassesTestMixin, TemplateView):
    template_name = f"{VERSION}/dashboard.html"

    def test_func(self):
        return self.request.user.is_staff

    def get_context_data(self):
        context = super().get_context_data()

        context["total_assessments"] = Assessment.objects.count()

        context["completed_assessments_by_updated_month"] = (
            Assessment.objects.filter(status="Complete")
            .annotate(month=TruncMonth("updated_at"))
            .values("month")
            .annotate(count=Count("id"))
            .values("month", "count")
            .order_by("month")
        )

        context["assessments_by_month"] = (
            Assessment.objects.exclude(status="Test")
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .values("month", "count")
            .order_by("month")
        )

        context["assessments_by_year"] = (
            Assessment.objects.filter(status="Complete")
            .annotate(year=TruncYear("updated_at"))
            .values("year")
            .annotate(count=Count("id"))
            .values("year", "count")
            .order_by("year")
        )

        context["duration_last60"] = (
            Assessment.objects.filter(
                status="Complete", updated_at__gt=datetime.now() - timedelta(days=60)
            )
            .annotate(duration=ExtractDay(F("updated_at") - F("created_at")))
            .values("duration")
            .annotate(count=Count("id"))
            .values("duration", "count")
            .order_by("duration")
        )

        context["duration_prev60"] = (
            Assessment.objects.filter(
                status="Complete",
                updated_at__gt=datetime.now() - timedelta(days=120),
                updated_at__lt=datetime.now() - timedelta(days=60),
            )
            .annotate(duration=ExtractDay(F("updated_at") - F("created_at")))
            .values("duration")
            .annotate(count=Count("id"))
            .values("duration", "count")
            .order_by("duration")
        )

        return context
