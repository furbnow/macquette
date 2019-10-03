from django.test import TestCase

from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.assessments.models import Assessment
from mhep.assessments.tests.factories import AssessmentFactory
from mhep.users.tests.factories import UserFactory


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
            "data": {},
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

    def test_update_assessment_data_fails_if_string(self):
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
                "data": {"foo string"},
            }

            response = self.client.patch(
                "/api/v1/assessments/{}/".format(a.pk),
                updateFields,
                format="json",
            )

        assert status.HTTP_400_BAD_REQUEST == response.status_code
        assert response.data == {
            'data': [
                exceptions.ErrorDetail(string='This field is not a dict.', code='invalid')
            ]
        }

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


class TestAssessmentHTMLView(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory()
        cls.me.set_password("foo")
        cls.me.save()
        cls.my_assessment = AssessmentFactory.create(owner=cls.me)

    def test_logged_out_users_get_redirected_to_log_in(self):
        login_url = '/accounts/login/'
        my_assessment_url = "/assessments/{}/".format(self.my_assessment.pk)
        response = self.client.get(my_assessment_url)
        self.assertRedirects(response, f"{login_url}?next={my_assessment_url}")

    def test_returns_204_for_logged_in_user_viewing_own_assessment(self):
        self.client.login(username=self.me.username, password="foo")
        my_assessment_url = "/assessments/{}/".format(self.my_assessment.pk)
        response = self.client.get(my_assessment_url)
        assert status.HTTP_200_OK == response.status_code

    def test_returns_not_found_if_not_owner(self):
        someone_else = UserFactory.create()
        someone_else.set_password("foo")
        someone_else.save()
        someone_elses_assessment = AssessmentFactory.create(owner=someone_else)

        self.client.login(username=self.me.username, password="foo")
        not_my_assessment_url = f"/assessments/{someone_elses_assessment.pk}/"
        response = self.client.get(not_my_assessment_url)
        assert status.HTTP_404_NOT_FOUND == response.status_code
