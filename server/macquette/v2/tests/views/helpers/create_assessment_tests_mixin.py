from django.contrib.auth import get_user_model
from freezegun import freeze_time
from rest_framework import exceptions, status

from macquette.users.tests.factories import UserFactory

from ....models import Assessment

User = get_user_model()


class CreateAssessmentTestsMixin:
    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create()

    def test_create_assessment_returns_expected_result_structure(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
            "data": {"foo": "baz"},  # data is specifically *not* returned
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED

        expected_result = {
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "status": "In progress",
            "name": "test assessment 1",
            "description": "test description 1",
            "owner": {
                "id": f"{self.user.id}",
                "name": self.user.name,
                "email": self.user.email,
            },
        }

        if hasattr(self, "organisation"):
            expected_result["organisation"] = {
                "id": f"{self.organisation.pk}",
                "name": self.organisation.name,
            }
        else:
            expected_result["organisation"] = None

        assert "id" in response.data
        response.data.pop("id")

        assert expected_result == response.data

    def test_accepts_no_data(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
        }

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED
        created_assessment = Assessment.objects.get(pk=response.data["id"])
        assert {} == created_assessment.data

    def test_sets_owner_to_logged_in_user(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
        }

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED
        created_assessment = Assessment.objects.get(pk=response.data["id"])
        assert self.user == created_assessment.owner

    def test_accepts_no_description(self):
        self.client.force_authenticate(self.user)

        new_assessment = {"name": "test assessment 1", "data": {"foo": "baz"}}

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["description"] == ""

    def test_returns_forbidden_if_not_logged_in(self):
        new_assessment = {"name": "test assessment 1"}

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_assessment_fails_if_name_missing(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {"description": "test description 2"},
            status.HTTP_400_BAD_REQUEST,
            {
                "name": [
                    exceptions.ErrorDetail(
                        string="This field is required.", code="required"
                    )
                ]
            },
        )

    def assert_create_fails(self, new_assessment, expected_status, expected_response):
        self.client.force_authenticate(self.user)

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == expected_status
        assert response.data == expected_response
