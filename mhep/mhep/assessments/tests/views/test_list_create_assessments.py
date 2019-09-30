from django.contrib.auth import get_user_model

from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.assessments.models import Assessment
User = get_user_model()


class TestListAssessments(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Assessment.objects.all().delete()

    def test_succeeds_for_logged_in_user(self):
        user = get_or_create_user("testuser")
        self.client.force_authenticate(user)

        with freeze_time("2019-06-01T16:35:34Z"):
            a1 = Assessment.objects.create(
                    name="test assessment 1",
                    description="test description",
                    data={"foo": "bar"},
                    openbem_version="10.1.1",
                    owner=user,
            )
            Assessment.objects.create(
                    name="test assessment 2",
                    description="test description",
                    data={"foo": "baz"},
                    openbem_version="10.1.1",
                    owner=user,
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

    def test_only_returns_assessments_for_logged_in_user(self):
        user = get_or_create_user("testuser")
        another_user = get_or_create_user("anotheruser")
        self.client.force_authenticate(user)

        with freeze_time("2019-06-01T16:35:34Z"):
            Assessment.objects.create(
                    name="my assessment #1",
                    openbem_version="10.1.1",
                    owner=user,
            )
            Assessment.objects.create(
                    name="my assessment #2",
                    openbem_version="10.1.1",
                    owner=user,
            )
            Assessment.objects.create(
                    name="someone elses assessment",
                    openbem_version="10.1.1",
                    owner=another_user,
            )

        response = self.client.get("/api/v1/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert 2 == len(response.data)

    def test_returns_forbidden_if_not_logged_in(self):
        response = self.client.get("/api/v1/assessments/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCreateAssessment(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.user = get_or_create_user("testuser")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Assessment.objects.all().delete()

    def test_create_assessment(self):
        self.client.force_authenticate(self.user)
        with self.subTest("without data"):
            new_assessment = {
                "name": "test assessment 1",
                "description": "test description 2",
                "openbem_version": "10.1.1",
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

        with self.subTest("without a description"):
            new_assessment = {
                "name": "test assessment 1",
                "openbem_version": "10.1.1",
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
                "description": "",
                "author": "localadmin",
                "userid": "1",
            }

            assert "id" in response.data
            response.data.pop("id")
            assert expected_result == response.data

    def test_create_assessment_doesnt_show_data_in_return_value(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment",
            "openbem_version": "10.1.1",
            "data": {"foo": "baz"}
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
            "name": "test assessment",
            "description": "",
            "author": "localadmin",
            "userid": "1",
        }

        assert "id" in response.data
        response.data.pop("id")
        assert expected_result == response.data

    def test_returns_forbidden_if_not_logged_in(self):
        new_assessment = {
                "name": "test assessment 1",
                "openbem_version": "10.1.1",
            }

        response = self.client.post("/api/v1/assessments/", new_assessment, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_assessment_fails_if_name_missing(self):
        self.client.force_authenticate(self.user)

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
        self.client.force_authenticate(self.user)

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

    def test_create_assessment_fails_if_openbem_version_is_not_valid_choice(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {
                "name": "test assessment 1",
                "openbem_version": "foo",
            },
            status.HTTP_400_BAD_REQUEST,
            {
                'openbem_version': [
                    exceptions.ErrorDetail(
                        string='"foo" is not a valid choice.',
                        code='invalid_choice',
                    )
                ]
            }
        )

    def test_create_assessment_fails_if_status_is_not_valid_choice(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {
                "name": "test assessment 1",
                "openbem_version": "10.1.1",
                "status": "bar"
            },
            status.HTTP_400_BAD_REQUEST,
            {
                'status': [
                    exceptions.ErrorDetail(
                        string='"bar" is not a valid choice.',
                        code='invalid_choice',
                    )
                ]
            }
        )

    def assert_create_fails(self, new_assessment, expected_status, expected_response):
        self.client.force_authenticate(self.user)

        response = self.client.post("/api/v1/assessments/", new_assessment, format="json")
        assert response.status_code == expected_status
        assert response.data == expected_response


def create_user(username, email='', *args, **kwargs):
    user = User.objects.create(username=username, email=email, *args, **kwargs)
    return user


def get_or_create_user(username, *args, **kwargs):
    if User.objects.filter(username=username).exists():
        return User.objects.get(username=username)
    return create_user(username, *args, **kwargs)
