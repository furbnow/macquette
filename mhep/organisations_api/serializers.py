from django.contrib.auth import get_user_model
from rest_framework import serializers

from mhep.organisations.models import Organisation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    A user's details.

    Be careful to specify read_only when using this serializer unless you want the API
    to be able to edit user data.
    """

    id = serializers.CharField(read_only=True)
    name = serializers.CharField()
    email = serializers.CharField()

    class Meta:
        model = User
        fields = ["id", "name", "email"]


class OrganisationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    permissions = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "members",
            "permissions",
        ]

    def get_members(self, org):
        def userinfo(user):
            return {
                "id": f"{user.id}",
                "name": user.name,
                "email": user.email,
                "last_login": user.last_login.isoformat()
                if user.last_login
                else "never",
                "is_admin": user in org.admins.all(),
                "is_librarian": user in org.librarians.all(),
            }

        return [userinfo(u) for u in org.members.all()]

    def get_permissions(self, org):
        user = self.context["request"].user
        return {
            "can_add_remove_members": user in org.admins.all(),
            "can_promote_demote_librarians": user in org.admins.all(),
        }


class OrganisationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = []


class OrganisationLibrarianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = []
