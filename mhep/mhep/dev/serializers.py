import datetime

from rest_framework import serializers

from . import VERSION
from .models import Assessment, Library, Organisation


class AuthorUserIDMixin():
    def get_author(self, obj):
        return obj.owner.username

    def get_userid(self, obj):
        return "{:d}".format(obj.owner.id)


class StringIDMixin():
    def get_id(self, obj):
        return '{:d}'.format(obj.id)


class MdateMixin():
    def get_mdate(self, obj):
        return "{:d}".format(
            int(datetime.datetime.timestamp(obj.updated_at))
        )


class AssessmentMetadataSerializer(
        MdateMixin,
        StringIDMixin,
        AuthorUserIDMixin,
        serializers.ModelSerializer):

    author = serializers.SerializerMethodField()
    userid = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    mdate = serializers.SerializerMethodField()

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        validated_data["organisation"] = self.context.get("organisation", None)
        return super().create(validated_data)

    class Meta:
        model = Assessment
        fields = [
            "id",
            "name",
            "description",
            "openbem_version",
            "status",
            "created_at",
            "updated_at",
            "author",
            "userid",
            "mdate",
        ]


class AssessmentFullSerializer(AssessmentMetadataSerializer):
    """
    Identical to AssessmentMetadataSerializer except that it includes the `data` field"
    """
    class Meta:
        model = Assessment
        fields = [
            "id",
            "name",
            "description",
            "openbem_version",
            "status",
            "created_at",
            "updated_at",
            "author",
            "userid",
            "mdate",
            "data",
        ]


class LibrarySerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    writeable = serializers.SerializerMethodField()
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
            "writeable",
            "owner",
        ]

    def get_writeable(self, library):
        from .views.helpers import check_library_write_permissions
        return check_library_write_permissions(library, self.context["request"])

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
                "name": owner_user.username,
            }
        else:
            return {
                "type": "global",
                "id": None,
                "name": "Global",
            }

    def create(self, validated_data):
        organisation = self.context.get("organisation", None)
        if organisation is not None:
            validated_data['owner_organisation'] = organisation
        else:
            validated_data['owner_user'] = self.context['request'].user
        return super().create(validated_data)


class LibraryItemSerializer(serializers.Serializer):
    tag = serializers.CharField(max_length=100)
    item = serializers.DictField(allow_empty=False)


class OrganisationSerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    assessments = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "assessments",
            "members",
        ]

    def get_assessments(self, obj):
        return obj.assessments.count()

    def get_members(self, obj):
        def userinfo(user):
            return {
                "userid": f"{user.id}",
                "name": user.username,
                "last_login": user.last_login.isoformat() if user.last_login else "never"
            }

        return [userinfo(u) for u in obj.members.all()]
