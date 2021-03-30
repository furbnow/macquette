from rest_framework import exceptions
from rest_framework import permissions

from mhep.organisations.models import Organisation


class IsAdminOfOrganisation(permissions.BasePermission):
    message = "You are not an admin of the Organisation."

    def has_permission(self, request, view):
        try:
            organisation = Organisation.objects.get(pk=view.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
        return request.user in organisation.admins.all()


class IsAdminOfAnyOrganisation(permissions.BasePermission):
    message = "You are not an admin of an organisation."

    def has_permission(self, request, view):
        orgs_where_admin = request.user.organisations_where_admin

        return orgs_where_admin.count() > 0
