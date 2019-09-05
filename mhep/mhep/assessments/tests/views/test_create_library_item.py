
from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.assessments.models import Library


class TestCreateLibraryItem(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Library.objects.all().delete()

    def test_create_library_item(self):
        library = Library.objects.create(
            name="test library",
            type="test type",
            data={
                "tag1": {"name": "foo"},
            },
        )

        item_data = {
            "tag": "tag2",
            "item": {
                "name": "bar",
            }
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.post(
                f"/api/v1/libraries/{library.id}/items/",
                item_data,
                format="json"
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_create_library_item_fails_if_tag_already_exists(self):
        library = Library.objects.create(
            name="test library",
            type="test type",
            data={
                "tag1": {"name": "foo"},
            },
        )

        item_data = {
            "tag": "tag1",
            "item": {
                "name": "bar",
            }
        }

        response = self.client.post(
            f"/api/v1/libraries/{library.id}/items/",
            item_data,
            format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {
            "detail": f"tag `tag1` already exists in library {library.id}"
        }
