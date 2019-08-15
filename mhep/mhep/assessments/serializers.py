from rest_framework import serializers
from mhep.assessments.models import Assessment


class AssessmentMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = ["name", "description", "openbem_version", "status", "created_at", "updated_at"]


class AssessmentFullSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = [
            "name",
            "description",
            "openbem_version",
            "status",
            "created_at",
            "updated_at",
            "data",
        ]
