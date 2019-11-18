from ..models import Assessment

from .. import VERSION


class AssessmentQuerySetMixin():
    def get_queryset(self, *args, **kwargs):
        my_assessments = Assessment.objects.filter(owner=self.request.user)
        assessments_in_my_organisations = Assessment.objects.filter(
            organisation__in=getattr(self.request.user, f"{VERSION}_organisations").all()
        )
        return my_assessments | assessments_in_my_organisations
