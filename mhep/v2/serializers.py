from itertools import zip_longest

from django.utils import timezone
from rest_framework import serializers

from mhep.users.models import User

from .models import Assessment, Image, Library, Organisation
from .models.assessment import STATUS_CHOICES


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.CharField()


class OrganisationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    permissions = serializers.SerializerMethodField()
    assessments = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "assessments",
            "members",
            "permissions",
        ]

    def get_assessments(self, org):
        user = self.context["request"].user
        if user in org.admins.all():
            return org.assessments.count()
        else:
            return org.assessments.filter(owner=user).count()

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

        return [userinfo(u) for u in org.members.all().order_by("id")]

    def get_permissions(self, org):
        user = self.context["request"].user
        return {
            "can_add_remove_members": user in org.admins.all(),
            "can_promote_demote_librarians": user in org.admins.all(),
        }


class OrganisationMetadataSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class ImagesMixin:
    def get_images(self, obj):
        if obj.featured_image is not None:
            featured_id = obj.featured_image.id
        else:
            featured_id = None

        s = ImageSerializer(obj.images, context={"featured_id": featured_id}, many=True)
        return s.data


class IsFeaturedMixin:
    def get_is_featured(self, obj):
        if "featured_id" in self.context:
            return self.context["featured_id"] == obj.id
        else:
            return False


class ImageSerializer(IsFeaturedMixin, serializers.ModelSerializer):
    url = serializers.URLField(source="image.url")
    thumbnail_url = serializers.URLField(source="thumbnail.url")
    is_featured = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = [
            "id",
            "url",
            "width",
            "height",
            "thumbnail_url",
            "thumbnail_width",
            "thumbnail_height",
            "note",
            "is_featured",
        ]


class FeaturedImageSerializer(serializers.Serializer):
    id = serializers.IntegerField()


class ImageUpdateSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=200)


class AssessmentMetadataSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    status = serializers.ChoiceField(choices=STATUS_CHOICES)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    owner = UserSerializer()
    organisation = OrganisationMetadataSerializer()


def get_access(assessment):
    owner = (assessment.owner, ["owner"])
    admins = (
        zip_longest(assessment.organisation.admins.all(), [], fillvalue=["org_admin"])
        if assessment.organisation
        else []
    )
    shared_with = zip_longest(assessment.shared_with.all(), [], fillvalue=["editor"])

    users_by_id = {}
    for user, roles in [owner, *admins, *shared_with]:
        if user.id not in users_by_id:
            users_by_id[user.id] = {
                "roles": roles,
                "id": f"{user.id}",
                "name": user.name,
                "email": user.email,
            }
        else:
            users_by_id[user.id]["roles"] += roles

    return list(users_by_id.values())


class AssessmentFullSerializer(ImagesMixin, serializers.ModelSerializer):
    """
    Identical to AssessmentMetadataSerializer except that it includes the `data` and
    `images` fields
    """

    id = serializers.CharField(read_only=True)
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects, write_only=True)
    organisation = OrganisationMetadataSerializer(read_only=True)
    access = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    def update(self, instance, validated_data):
        if "data" in validated_data:
            instance.updated_at = timezone.now()
        return super().update(instance, validated_data)

    def get_permissions(self, library):
        from .views.helpers import (
            check_assessment_reassign_permissions,
            check_assessment_share_permissions,
        )

        (can_reassign, _) = check_assessment_reassign_permissions(
            library, self.context["request"], self.context["request"].user.pk
        )

        return {
            "can_share": check_assessment_share_permissions(
                library, self.context["request"]
            ),
            "can_reassign": can_reassign,
        }

    def get_access(self, assessment):
        return get_access(assessment)

    class Meta:
        model = Assessment
        fields = [
            "id",
            "name",
            "description",
            "status",
            "created_at",
            "updated_at",
            "organisation",
            "owner",
            "access",
            "permissions",
            "images",
            "data",
        ]


class LibrarySerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    permissions = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    class Meta:
        model = Library
        fields = [
            "id",
            "name",
            "type",
            "data",
            "created_at",
            "updated_at",
            "permissions",
            "owner",
        ]

    def get_permissions(self, library):
        from .views.helpers import (
            check_library_share_permissions,
            check_library_write_permissions,
        )

        return {
            "can_write": check_library_write_permissions(
                library, self.context["request"]
            ),
            "can_share": check_library_share_permissions(
                library, self.context["request"]
            ),
        }

    def get_owner(self, obj):
        owner_organisation = obj.owner_organisation
        owner_user = obj.owner_user
        if owner_organisation is not None:
            return {
                "type": "organisation",
                "id": f"{owner_organisation.id}",
                "name": owner_organisation.name,
            }
        elif owner_user is not None:
            return {
                "type": "personal",
                "id": f"{owner_user.id}",
                "name": owner_user.name,
            }
        else:
            return {"type": "global", "id": None, "name": "Global"}

    def create(self, validated_data):
        organisation = self.context.get("organisation", None)
        if organisation is not None:
            validated_data["owner_organisation"] = organisation
        else:
            validated_data["owner_user"] = self.context["request"].user
        return super().create(validated_data)


class LibraryItemSerializer(serializers.Serializer):
    tag = serializers.CharField(max_length=100)
    item = serializers.DictField(allow_empty=False)


class OrganisationLibrarianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields: list[str] = []


class OrganisationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields: list[str] = []


class OrganisationInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField()
