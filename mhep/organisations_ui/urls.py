from django.urls import path

from mhep.organisations_ui import views

app_name = "organisations-ui"
urlpatterns = [
    path("", view=views.OrganisationEditor.as_view(), name="index"),
]
