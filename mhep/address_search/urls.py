from django.urls import path

from . import views

app_name = "address-search"
urlpatterns = [
    path("v1/suggestions/", view=views.ListSuggestions.as_view(), name="suggestions"),
    path("v1/lookup/", view=views.PerformLookup.as_view(), name="lookup"),
]
