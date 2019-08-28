
from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.assessments.models import Library


class TestUpdateDestroyLibraryItem(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Library.objects.all().delete()

    def test_destroy_library_item(self):
        library = Library.objects.create(
            name="test library",
            type="test type",
            data={
                "tag1": {"name": "foo"},
                "tag2": {"name": "bar"},
            },
        )

        response = self.client.delete(f"/api/v1/libraries/{library.id}/items/tag2/")

        assert response.status_code == status.HTTP_204_NO_CONTENT

        retrieved = Library.objects.get(id=library.id)
        assert retrieved.data == {"tag1": {"name": "foo"}}

    def test_update_library_item(self):
        library = Library.objects.create(
            name="test library",
            type="test type",
            data={
                "tag1": {"name": "foo"},
            },
        )

        replacement_data = {
            "name": "bar",
            "other": "data",
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.put(
                f"/api/v1/libraries/{library.id}/items/tag1/",
                replacement_data,
                format="json"
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        retrieved = Library.objects.get(id=library.id)
        assert retrieved.data == {"tag1": replacement_data}
