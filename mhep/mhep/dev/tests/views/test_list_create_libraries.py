from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from ... import VERSION
from ...models import Library
from ..factories import LibraryFactory, OrganisationFactory

from mhep.users.tests.factories import UserFactory


class TestListLibraries(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory.create()

    def test_returns_libraries_in_correct_format(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            l1 = LibraryFactory.create(owner_user=self.me)
            l2 = LibraryFactory.create(owner_user=self.me)
            global_lib = LibraryFactory.create(owner_user=None, owner_organisation=None)
            LibraryFactory.create(owner_user=UserFactory.create())  # another library (someone else's)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 3 == len(response.data)

        assert {
            "id": "{}".format(l1.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": l1.name,
            "type": l1.type,
            "writeable": True,
            "data": l1.data,
            "owner": {
                "id": f"{self.me.id}",
                "name": f"{self.me.username}",
                "type": "personal",
            },
        } == response.data[0]

        assert {
            "id": "{}".format(l2.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": l2.name,
            "type": l2.type,
            "writeable": True,
            "data": l2.data,
            "owner": {
                "id": f"{self.me.id}",
                "name": f"{self.me.username}",
                "type": "personal",
            },
        } == response.data[1]

        assert {
            "id": "{}".format(global_lib.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": global_lib.name,
            "type": global_lib.type,
            "writeable": False,
            "data": global_lib.data,
            "owner": {
                "id": None,
                "name": "Global",
                "type": "global",
            },
        } == response.data[2]

    def test_includes_libraries_from_my_organisations(self):
        my_lib = LibraryFactory.create(owner_user=self.me, owner_organisation=None)

        org1 = OrganisationFactory.create()
        org1.members.add(self.me)
        org_lib_1 = LibraryFactory.create(owner_organisation=org1, owner_user=None)

        org2 = OrganisationFactory.create()
        org2.members.add(self.me)
        org_lib_2 = LibraryFactory.create(owner_organisation=org2, owner_user=None)

        other_org = OrganisationFactory.create()  # not a member of this org
        other_lib = LibraryFactory.create(owner_organisation=other_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 3 == len(response.data)

        retrieved_ids = [int(l["id"]) for l in response.data]

        assert my_lib.id in retrieved_ids
        assert org_lib_1.id in retrieved_ids
        assert org_lib_2.id in retrieved_ids
        assert other_lib.id not in retrieved_ids

    def test_includes_global_libraries_with_no_owner(self):
        global_lib = LibraryFactory.create(owner_organisation=None, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 1 == len(response.data)

        retrieved_ids = [int(l["id"]) for l in response.data]

        assert global_lib.id in retrieved_ids

    def test_list_libraries_fails_if_not_logged_in(self):
        LibraryFactory.create(owner_user=self.me)
        LibraryFactory.create(owner_user=self.me)

        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert status.HTTP_403_FORBIDDEN == response.status_code


class TestCreateLibraries(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory.create()

    def test_create_library(self):

        with self.subTest("a valid library"):
            new_library = {
                "name": "test library 1",
                "type": "test type 1",
                "data": {"foo": "bar"}
            }

            self.client.force_authenticate(self.me)
            with freeze_time("2019-06-01T16:35:34Z"):
                response = self.client.post(f"/{VERSION}/api/libraries/", new_library, format="json")

            assert response.status_code == status.HTTP_201_CREATED

            expected_result = {
                "created_at": "2019-06-01T16:35:34Z",
                "updated_at": "2019-06-01T16:35:34Z",
                "name": "test library 1",
                "type": "test type 1",
                "writeable": True,
                "data": {"foo": "bar"},
                "owner": {
                    "id": f"{self.me.id}",
                    "name": f"{self.me.username}",
                    "type": "personal",
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
                response = self.client.post(f"/{VERSION}/api/libraries/", new_library, format="json")

            assert status.HTTP_400_BAD_REQUEST == response.status_code
            assert {
                'data': [
                    exceptions.ErrorDetail(string='This field is not a dict.', code='invalid')
                ]
            } == response.data

    def test_create_library_has_logged_in_user_as_owner(self):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"}
        }

        self.client.force_authenticate(self.me)

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.post(f"/{VERSION}/api/libraries/", new_library, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        assert "id" in response.data
        new_id = response.data.pop("id")

        retrieved = Library.objects.get(id=new_id)
        assert self.me == retrieved.owner_user
        assert None is retrieved.owner_organisation