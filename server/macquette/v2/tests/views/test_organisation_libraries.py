from freezegun import freeze_time
from rest_framework import exceptions, status
from rest_framework.test import APITestCase

from macquette.users.tests.factories import UserFactory

from ... import VERSION
from ...models import Library
from ..factories import OrganisationFactory


class TestCreateOrganisationLibraries(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()
        cls.org = OrganisationFactory.create()
        cls.org.members.add(cls.me)
        cls.org.librarians.add(cls.me)

    def test_create_returns_correct_format(self):
        with self.subTest("a valid library"):
            new_library = {
                "name": "test library 1",
                "type": "test type 1",
                "data": {"foo": "bar"},
            }

            self.client.force_authenticate(self.me)
            with freeze_time("2019-06-01T16:35:34Z"):
                response = self.client.post(
                    f"/{VERSION}/api/organisations/{self.org.id}/libraries/",
                    new_library,
                    format="json",
                )

            assert response.status_code == status.HTTP_201_CREATED

            expected_result = {
                "created_at": "2019-06-01T16:35:34Z",
                "updated_at": "2019-06-01T16:35:34Z",
                "name": "test library 1",
                "type": "test type 1",
                "permissions": {"can_write": True, "can_share": False},
                "data": {"foo": "bar"},
                "owner": {
                    "id": f"{self.org.id}",
                    "name": f"{self.org.name}",
                    "type": "organisation",
                },
            }

            assert "id" in response.data
            response.data.pop("id")
            assert expected_result == response.data

        with self.subTest("a library with data as a string"):
            new_library = {
                "name": "test library 1",
                "type": "test type 1",
                "data": "foo string",
            }

            self.client.force_authenticate(self.me)

            with freeze_time("2019-06-01T16:35:34Z"):
                response = self.client.post(
                    f"/{VERSION}/api/organisations/{self.org.id}/libraries/",
                    new_library,
                    format="json",
                )

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert {
                "data": [
                    exceptions.ErrorDetail(
                        string="This field is not a dict.", code="invalid"
                    )
                ]
            } == response.data

    def test_has_organisation_as_owner(self):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"},
        }

        self.client.force_authenticate(self.me)

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.post(
                f"/{VERSION}/api/organisations/{self.org.id}/libraries/",
                new_library,
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED

        assert "id" in response.data
        new_id = response.data.pop("id")

        retrieved = Library.objects.get(id=new_id)
        assert self.org == retrieved.owner_organisation
        assert None is retrieved.owner_user
