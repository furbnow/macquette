from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from mhep.assessments.models import Assessment


class TestAssessmentDetail(APITestCase):
    def tearDownClass(cls):
        Assessment.objects.delete()

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
