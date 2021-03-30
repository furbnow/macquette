from django.urls import path

from . import views

app_name = "organisations-api"
urlpatterns = [
    # TODO: This is a bit of a wart.  Maybe we should have a users_api module for this?
    # Seems a bit overkill but maybe not, IDK.
    path("users/", view=views.ListUsers.as_view(), name="list-users"),
    path(
        "",
        view=views.ListOrganisations.as_view(),
        name="list",
    ),
    path(
        "<int:pk>/members/<int:userid>/",
        view=views.CreateDeleteOrganisationMembers.as_view(),
        name="create-delete-members",
    ),
    path(
        "<int:pk>/librarians/<int:userid>/",
        view=views.CreateDeleteOrganisationLibrarians.as_view(),
        name="create-delete-librarians",
    ),
]
