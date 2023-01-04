from rest_framework import exceptions, permissions

from mhep.organisations.models import Organisation


class CanAddRemoveMembers(permissions.BasePermission):
    message = "You are not an admin of the Organisation."

    def has_permission(self, request, view):
        try:
            organisation = Organisation.objects.get(pk=view.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
        return organisation.can_add_remove_members(request.user)


class CanPromoteDemoteLibrarians(permissions.BasePermission):
    message = "You are not an admin of the Organisation."

    def has_permission(self, request, view):
        try:
            organisation = Organisation.objects.get(pk=view.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
        return organisation.can_promote_demote_librarians(request.user)


class CanListOrganisations(permissions.BasePermission):
    message = "You are not an admin of an organisation."

    def has_permission(self, request, view) -> bool:
        return request.user.can_list_organisations()


class CanListUsers(permissions.BasePermission):
    message = "You are not an admin of an organisation."

    def has_permission(self, request, view) -> bool:
        return request.user.can_list_users()
