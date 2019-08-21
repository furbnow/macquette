from rest_framework import serializers
from mhep.assessments.models import Assessment


class HardcodedAuthorUserIDMixin():
    def get_author(self, obj):
        return "localadmin"

    def get_userid(self, obj):
        return "1"


class StringIDMixin():
    def get_id(self, obj):
        return '{:d}'.format(obj.id)


class AssessmentMetadataSerializer(
        StringIDMixin,
        HardcodedAuthorUserIDMixin,
        serializers.ModelSerializer):

    author = serializers.SerializerMethodField()
    userid = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()

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
        ]


class AssessmentFullSerializer(
        StringIDMixin,
        HardcodedAuthorUserIDMixin,
        serializers.ModelSerializer):

    author = serializers.SerializerMethodField()
    userid = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()

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
            "data",
        ]
