from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.assessments.models import Assessment


class TestListCreateAssessments(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Assessment.objects.all().delete()

    def test_list_assessments(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a1 = Assessment.objects.create(
                    name="test assessment 1",
                    description="test description",
                    data={"foo": "bar"},
                    openbem_version="10.1.1",
            )
            Assessment.objects.create(
                    name="test assessment 2",
                    description="test description",
                    data={"foo": "baz"},
                    openbem_version="10.1.1",
            )

        response = self.client.get("/api/v1/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert 2 == len(response.data)

        expectedFirstResult = {
            "id": "{}".format(a1.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description",
            "author": "localadmin",
            "userid": "1",
        }

        assert expectedFirstResult == response.data[0]

    def test_create_assessment(self):
        new_assessment = {
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description 2",
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.post("/api/v1/assessments/", new_assessment, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        expected_result = {
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description 2",
            "author": "localadmin",
            "userid": "1",
        }

        assert "id" in response.data
        response.data.pop("id")
        assert expected_result == response.data

    def test_create_assessment_fails_if_name_missing(self):
        self.assert_create_fails(
            {
                "openbem_version": "10.1.1",
                "description": "test description 2",
            },
            status.HTTP_400_BAD_REQUEST,
            {
                'name': [
                    exceptions.ErrorDetail(string='This field is required.', code='required')
                ]
            }
        )

    def test_create_assessment_fails_if_openbem_version_missing(self):
        self.assert_create_fails(
            {
                "name": "test assessment 1",
                "description": "test description 2",
            },
            status.HTTP_400_BAD_REQUEST,
            {
                'openbem_version': [
                    exceptions.ErrorDetail(string='This field is required.', code='required')
                ]
            }
         )

    def assert_create_fails(self, new_assessment, expected_status, expected_response):
        response = self.client.post("/api/v1/assessments/", new_assessment, format="json")
        assert response.status_code == expected_status
        assert response.data == expected_response
