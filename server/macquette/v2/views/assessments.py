import io
import os

import PIL
from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework import exceptions, generics, parsers, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Assessment, Image
from ..permissions import (
    IsAdminOfConnectedOrganissation,
    IsAssessmentOwner,
    IsInOrganisation,
)
from ..serializers import (
    AssessmentFullSerializer,
    AssessmentFullWithoutDataSerializer,
    AssessmentMetadataSerializer,
    FeaturedImageSerializer,
    ImageSerializer,
    get_access,
)
from .mixins import AssessmentQuerySetMixin


class ListCreateAssessments(AssessmentQuerySetMixin, generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, *args, **kwargs):
        queryset = super().get_queryset(*args, **kwargs)
        return queryset.prefetch_related("owner", "organisation").defer("data")

    class InputSerializer(serializers.Serializer):
        name = serializers.CharField()
        description = serializers.CharField(allow_blank=True, required=False)
        # SAFETY: this field shadows a property of the same name but with a
        # different type. This is fine at runtime but not in typechecking (yet).
        data = serializers.JSONField(allow_null=True, default=dict)  # type: ignore[assignment]

    def post(self, request, *args, **kwargs):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assessment = Assessment.objects.create(
            **serializer.data,
            owner=request.user,
        )

        result = AssessmentMetadataSerializer(assessment)
        return Response(result.data, status=status.HTTP_201_CREATED)


class RetrieveUpdateDestroyAssessment(
    AssessmentQuerySetMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = AssessmentFullSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        assessment = self.get_object()

        serializer = self.get_serializer(assessment, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        if "data" in request.data and assessment.status == "Complete":
            return Response(
                {"detail": "can't update data when status is 'complete'"},
                status.HTTP_400_BAD_REQUEST,
            )

        if "owner" in request.data:
            from .helpers import check_assessment_reassign_permissions

            can_reassign, message = check_assessment_reassign_permissions(
                assessment, request, request.data["owner"]
            )
            if not can_reassign:
                return Response({"detail": message}, status.HTTP_400_BAD_REQUEST)

        serializer.save()

        non_data_fields = {*request.data.keys()} - {"data"}
        if len(non_data_fields) > 0:
            return Response(
                AssessmentFullWithoutDataSerializer(
                    assessment, context={"request": request}
                ).data,
                status.HTTP_200_OK,
            )
        else:
            return Response(None, status.HTTP_204_NO_CONTENT)


class ShareUnshareAssessment(AssessmentQuerySetMixin, generics.GenericAPIView):
    permission_classes = [
        IsAuthenticated,
        IsInOrganisation,
        IsAssessmentOwner | IsAdminOfConnectedOrganissation,
    ]

    def put(self, request, pk, userid):
        assessment = self.get_object()

        if not assessment.organisation.members.filter(id=userid).exists():
            return Response(
                {"detail": "can't share to users outside organisation"},
                status.HTTP_400_BAD_REQUEST,
            )

        assessment.shared_with.add(userid)

        return Response(get_access(assessment), status.HTTP_200_OK)

    def delete(self, request, pk, userid):
        assessment = self.get_object()

        if not assessment.organisation:
            return Response(
                {"detail": "can't unshare private assessment"},
                status.HTTP_400_BAD_REQUEST,
            )

        assessment.shared_with.remove(userid)

        return Response(get_access(assessment), status.HTTP_200_OK)


class DuplicateAssessment(AssessmentQuerySetMixin, generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        assessment = self.get_object()

        assessment.pk = None
        assessment.name = f"Copy of {assessment.name}"
        assessment.owner = request.user
        assessment.save()

        response = AssessmentMetadataSerializer(assessment).data

        return Response(response, status.HTTP_200_OK)


class SetFeaturedImage(AssessmentQuerySetMixin, generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        assessment = self.get_object()

        serializer = FeaturedImageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "invalid id"}, status.HTTP_400_BAD_REQUEST)

        try:
            image = Image.objects.get(pk=serializer.validated_data["id"])
        except Image.DoesNotExist:
            return Response(
                {"detail": "image ID doesn't exist"}, status.HTTP_400_BAD_REQUEST
            )

        if image not in assessment.images.all():
            return Response(
                {"detail": "image ID provided doesn't belong to this assessment"},
                status.HTTP_400_BAD_REQUEST,
            )

        assessment.featured_image = image
        assessment.updated_at = timezone.now()
        assessment.save(update_fields=["updated_at", "featured_image"])

        return Response(None, status.HTTP_204_NO_CONTENT)


class UploadAssessmentImage(AssessmentQuerySetMixin, generics.GenericAPIView):
    parser_class = [parsers.FileUploadParser]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _make_thumbnail(image, record: Image):
        image = PIL.ImageOps.exif_transpose(image)

        record.width = image.width
        record.height = image.height

        # We paste transparent images onto a new image with a white background,
        # and then use that as our image.  This is because we're saving as JPEG, which
        # famously does not support transparency.
        if image.mode in ["RGBA", "LA"]:
            background = PIL.Image.new(image.mode[:-1], image.size, "white")
            background.paste(image, image.split()[-1])
            image = background

        # 600x600 is a substantial size saving on bigger images while still not looking
        # super-lossy on a high DPI screen
        image.thumbnail((600, 600))

        # Save thumbnail to in-memory file
        temp_thumb = io.BytesIO()
        image.save(temp_thumb, "JPEG")
        temp_thumb.seek(0)

        # save=False is because otherwise it will run in an infinite loop
        record.thumbnail.save("thumb.jpg", ContentFile(temp_thumb.read()), save=False)
        temp_thumb.close()

        record.thumbnail_width = image.width
        record.thumbnail_height = image.height

    @staticmethod
    def _set_note(record: Image):
        leaf, ext = os.path.splitext(os.path.basename(record.image.name))
        record.note = leaf

    def post(self, request, pk):
        if "file" not in request.FILES:
            return Response({"detail": "no file provided"}, status.HTTP_400_BAD_REQUEST)

        assessment = self.get_object()
        file = request.FILES["file"]
        record = Image(assessment=assessment, image=file)

        try:
            image = PIL.Image.open(record.image)
        except PIL.UnidentifiedImageError:
            raise exceptions.ParseError(detail="Could not process image format")

        self._make_thumbnail(image, record)
        self._set_note(record)
        record.save()
        response = ImageSerializer(record).data

        assessment.updated_at = timezone.now()
        assessment.save(update_fields=["updated_at"])

        return Response(response, status.HTTP_200_OK)
