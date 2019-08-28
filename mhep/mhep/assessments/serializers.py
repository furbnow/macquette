import datetime

from rest_framework import serializers
from mhep.assessments.models import Assessment, Library


class HardcodedAuthorUserIDMixin():
    def get_author(self, obj):
        return "localadmin"

    def get_userid(self, obj):
        return "1"


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
        HardcodedAuthorUserIDMixin,
        serializers.ModelSerializer):

    author = serializers.SerializerMethodField()
    userid = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    mdate = serializers.SerializerMethodField()

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


class AssessmentFullSerializer(
        MdateMixin,
        StringIDMixin,
        HardcodedAuthorUserIDMixin,
        serializers.ModelSerializer):

    author = serializers.SerializerMethodField()
    userid = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    mdate = serializers.SerializerMethodField()

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

    class Meta:
        model = Library
        fields = [
            "id",
            "name",
            "type",
            "data",
            "created_at",
            "updated_at",
        ]
