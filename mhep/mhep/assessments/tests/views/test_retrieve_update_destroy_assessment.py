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

    def test_get_assessment_without_data_gets_sensible_default(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = Assessment.objects.create(
                    name="test name",
                    openbem_version="10.1.1",
            )

        response = self.client.get("/api/v1/assessments/{}/".format(a.pk))
        assert response.status_code == status.HTTP_200_OK

        expected = {
            "id": f"{a.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "openbem_version": "10.1.1",
            "name": "test name",
            # defaults:
            "description": "",
            "author": "localadmin",
            "userid": "1",
            "status": "In progress",
            "data": None,
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

    def test_update_assessment_data_fails_if_assessment_is_complete(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = Assessment.objects.create(
                    name="test name",
                    description="test description",
                    data={"foo": "bar"},
                    status="Complete",
                    openbem_version="10.1.1",
            )

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"new": "data"},
            }

            response = self.client.patch(
                "/api/v1/assessments/{}/".format(a.pk),
                updateFields,
                format="json",
            )

        assert status.HTTP_400_BAD_REQUEST == response.status_code
        assert response.data == {'detail': "can't update data when status is 'complete'"}

    def test_assessment_status_can_change_from_complete_to_in_progress(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = Assessment.objects.create(
                    name="test name",
                    description="test description",
                    data={"foo": "bar"},
                    status="Complete",
                    openbem_version="10.1.1",
            )

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "status": "In progress"
            }

            response = self.client.patch(
                "/api/v1/assessments/{}/".format(a.pk),
                updateFields,
                format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code

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
