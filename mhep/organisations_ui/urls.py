from django.urls import path
from django.views.generic.base import TemplateView

app_name = "organisations-ui"
urlpatterns = [
    path(
        "",
        view=TemplateView.as_view(template_name="organisations/index.html"),
        name="index",
    ),
]
