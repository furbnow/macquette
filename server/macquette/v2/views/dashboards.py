from datetime import datetime, timedelta

from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import Count, F
from django.db.models.functions import ExtractDay, TruncMonth, TruncYear
from django.views.generic.base import TemplateView

from macquette.users.models import User
from macquette.v2.models.assessment import Assessment

from .. import VERSION


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
            .values("year", "organisation_id", "organisation__name")
            .annotate(count=Count("id"))
            .values("year", "count", "organisation_id", "organisation__name")
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

        context["user_total_count"] = User.objects.count()
        context["user_recent_count"] = User.objects.exclude(
            last_login__lt=datetime.now() - timedelta(days=90)
        ).count()

        context["user_counts_by_login_month"] = (
            User.objects.annotate(month=TruncMonth("last_login"))
            .values("month")
            .annotate(count=Count("id"))
            .values("month", "count")
            .order_by("month")
        )

        return context
