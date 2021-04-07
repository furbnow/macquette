from django.core.exceptions import PermissionDenied
from django.views.generic.base import TemplateView


class OrganisationEditor(TemplateView):
    template_name = "organisations/index.html"

    def dispatch(self, request, *args, **kwargs):
        if not request.user.can_list_organisations():
            raise PermissionDenied("You do not have permission to list organisations.")

        return super().dispatch(request, *args, **kwargs)
