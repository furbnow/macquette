from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.assessments.models import Assessment


class TestRetrieveUpdateDestroyAssessment(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Assessment.objects.all().delete()

    def test_get_assessment(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = Assessment.objects.create(
                    name="test name",
                    description="test description",
                    data={"foo": "bar"},
                    status="In progress",
                    openbem_version="10.1.1",
            )

        response = self.client.get("/api/v1/assessments/{}/".format(a.pk))
        assert response.status_code == status.HTTP_200_OK

        expected = {
            "id": "{}".format(a.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test name",
            "description": "test description",
            "author": "localadmin",
            "userid": "1",
            "data": {"foo": "bar"},
        }
        assert expected == response.data

    def test_get_assessment_for_bad_id(self):
        response = self.client.get("/api/v1/assessments/{}/".format("bad-id"))
        assert status.HTTP_404_NOT_FOUND == response.status_code

    def test_update_assessment(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = Assessment.objects.create(
                    name="test name",
                    description="test description",
                    data={"foo": "bar"},
                    status="In progress",
                    openbem_version="10.1.1",
            )

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"new": "data"},
                "status": "Complete",
            }

            response = self.client.patch(
                "/api/v1/assessments/{}/".format(a.pk),
                updateFields,
                format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_assessment = Assessment.objects.get(pk=a.pk)

        assert {"new": "data"} == updated_assessment.data
        assert "Complete" == updated_assessment.status

        assert "2019-07-13T12:10:12+00:00" == updated_assessment.updated_at.isoformat()

    def test_destroy_assessment(self):
        a = Assessment.objects.create(
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
                openbem_version="10.1.1",
        )

        assessment_count = Assessment.objects.count()

        response = self.client.delete(f"/api/v1/assessments/{a.pk}/")

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        assert (assessment_count - 1) == Assessment.objects.count()


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
