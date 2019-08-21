from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from mhep.assessments.models import Assessment


class TestAssessmentDetail(APITestCase):
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
