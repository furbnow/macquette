from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from mhep.assessments.models import Library


class TestListCreateLibraries(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Library.objects.all().delete()

    def test_list_libraries(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a1 = Library.objects.create(
                    name="test library 1",
                    type="test type 1",
                    data={"foo": "bar"},
            )
            Library.objects.create(
                    name="test library 1",
                    type="test type 1",
                    data={"foo": "baz"},
            )

        response = self.client.get("/api/v1/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 2 == len(response.data)

        expectedFirstResult = {
            "id": "{}".format(a1.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": "test library 1",
            "type": "test type 1",
            "writeable": True,
            "data": {"foo": "bar"},
        }

        assert expectedFirstResult == response.data[0]

    def test_create_library(self):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"}
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.post("/api/v1/libraries/", new_library, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        expected_result = {
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": "test library 1",
            "type": "test type 1",
            "writeable": True,
            "data": {"foo": "bar"}
        }

        assert "id" in response.data
        response.data.pop("id")
        assert expected_result == response.data
