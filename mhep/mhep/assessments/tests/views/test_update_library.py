from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from mhep.assessments.models import Library


class TestUpdateLibrary(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Library.objects.all().delete()

    def test_update_library(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = Library.objects.create(
                    name="test name",
                    type="test type",
                    data={"foo": "bar"},
            )

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"new": "data"},
            }

            response = self.client.patch(
                "/api/v1/libraries/{}/".format(a.pk),
                updateFields,
                format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_library = Library.objects.get(pk=a.pk)

        assert {"new": "data"} == updated_library.data

        assert "2019-07-13T12:10:12+00:00" == updated_library.updated_at.isoformat()
