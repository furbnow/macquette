from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    # https://www.django-rest-framework.org/api-guide/permissions/#custom-permissions
    message = "You are not the owner of the Assessment."

    def has_object_permission(self, request, view, assessment):
        return request.user == assessment.owner


class IsMemberOfConnectedOrganisation(permissions.BasePermission):
    message = "You are not a member of the Assessment's Organisation."

    def has_object_permission(self, request, view, assessment):
        if assessment.organisation is None:
            return False

        return request.user in assessment.organisation.members.all()
