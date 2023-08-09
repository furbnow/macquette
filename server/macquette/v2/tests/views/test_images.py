import pathlib
import tempfile
from datetime import timedelta
from urllib.parse import urlparse

import pytest
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from macquette.users.tests.factories import UserFactory

from ... import VERSION, models, serializers
from ...serializers import ImageSerializer
from .. import factories
from ..factories import AssessmentFactory
from .helpers import assert_url_is_presigned, get_presigned_url_expiry


class TestEditImageNote(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()

    def test_valid_note(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.patch(
            f"/{VERSION}/api/images/{i1.pk}/",
            {"note": "Althusser's front door"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        i1.refresh_from_db()
        assert response.data == serializers.ImageSerializer(i1).data

    def test_not_my_assessment(self):
        someone_else = UserFactory.create()

        a = factories.AssessmentFactory.create(owner=someone_else)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.patch(
            f"/{VERSION}/api/images/{i1.pk}/",
            {"note": "Judith Butler's porch"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_null_note_not_allowed(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.patch(
            f"/{VERSION}/api/images/{i1.pk}/", {"note": None}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestDeleteImage(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()

    def test_valid_image(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/images/{i1.pk}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert models.Image.objects.filter(pk=i1.id).count() == 0

    def test_not_my_assessment(self):
        someone_else = UserFactory.create()

        a = factories.AssessmentFactory.create(owner=someone_else)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/images/{i1.pk}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN


IMG_WIDTH = 1200
IMG_HEIGHT = 900


def make_image():
    image = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT))
    file = tempfile.NamedTemporaryFile(suffix=".jpg")
    image.save(file)
    file.seek(0)
    return file


@pytest.mark.django_db()
def test_upload_image_no_file(client):
    user = UserFactory.create()
    a = AssessmentFactory.create()

    client.force_login(user)
    response = client.post(f"/{VERSION}/api/assessments/{a.pk}/images/")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "no file" in response.data["detail"]


@pytest.mark.django_db()
def test_upload_image(client, media_s3_bucket):
    user = UserFactory.create()
    a = AssessmentFactory.create(owner=user)
    file = make_image()

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/assessments/{a.pk}/images/",
        {"file": file},
        format="multipart",
    )

    assert response.status_code == status.HTTP_200_OK

    pk = response.data["id"]
    record = models.Image.objects.get(pk=pk)
    assert response.data == ImageSerializer(record).data

    assert_url_is_presigned(response.data["url"])
    assert get_presigned_url_expiry(response.data["url"]) == timedelta(hours=4)

    assert_url_is_presigned(response.data["thumbnail_url"])
    assert get_presigned_url_expiry(response.data["thumbnail_url"]) == timedelta(
        hours=4
    )

    thumbnail_url = urlparse(response.data["thumbnail_url"])
    assert thumbnail_url.path.endswith("_thumb.jpg")
    assert response.data["note"] == pathlib.PurePath(file.name).stem

    assert response.data["width"] == IMG_WIDTH
    assert response.data["height"] == IMG_HEIGHT

    assert response.data["thumbnail_width"] <= 600
    assert response.data["thumbnail_height"] <= 600
