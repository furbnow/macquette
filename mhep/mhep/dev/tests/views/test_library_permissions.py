from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import (
    LibraryFactory,
    OrganisationFactory,
)


class CommonMixin():
    def _assert_error(self, response, expected_status, expected_detail):
        assert expected_status == response.status_code
        assert {"detail": expected_detail} == response.json()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.library = LibraryFactory.create()


class TestCreateLibraryPermissions(CommonMixin, APITestCase):
    def test_authenticated_user_can_create_a_library(self):
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint()
        assert status.HTTP_201_CREATED == response.status_code

    def test_unauthenticated_user_cannot_create_a_library(self):
        response = self._call_endpoint()
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def _call_endpoint(self):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"}
        }

        return self.client.post(f"/{VERSION}/api/libraries/", new_library, format="json")


class TestCreateOrganisationLibraryPermissions(CommonMixin, APITestCase):
    def test_member_of_organisation_can_create_a_library_in_organisation(self):
        person = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(organisation)
        assert status.HTTP_201_CREATED == response.status_code

    def test_unauthenticated_user_cannot_create_a_library_in_organisation(self):
        response = self._call_endpoint(OrganisationFactory.create())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_member_cannot_create_a_library_in_organisation(self):
        person = UserFactory.create()
        org_with_no_members = OrganisationFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(org_with_no_members)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not a member of the Organisation.",
        )

    def _call_endpoint(self, org):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"}
        }

        return self.client.post(
            f"/{VERSION}/api/organisations/{org.id}/libraries/", new_library, format="json"
        )


class TestUpdateLibraryPermissions(CommonMixin, APITestCase):
    def test_owner_user_can_update_library(self):
        self.client.force_authenticate(self.library.owner_user)

        response = self._call_endpoint(self.library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_update_library(self):
        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_update_library(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "Not found.",
        )

    def test_member_of_organisation_can_update_a_library_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=organisation,
            owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_member_cannot_update_a_library_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=org_with_no_members,
            owner_user=None,
        )
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "Not found.",
        )

    def _call_endpoint(self, library):
        update_fields = {
            "data": {"new": "data"},
        }

        return self.client.patch(
            f"/{VERSION}/api/libraries/{library.id}/",
            update_fields,
            format="json",
        )


class TestDeleteLibraryPermissions(CommonMixin, APITestCase):
    def test_owner_user_can_delete_library(self):
        self.client.force_authenticate(self.library.owner_user)

        response = self._call_endpoint(self.library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_delete_library(self):
        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_delete_library(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "Not found.",
        )

    def test_member_of_organisation_can_delete_a_library_in_organisation(self):
        pass

    def test_user_who_isnt_member_cannot_delete_a_library_in_organisation(self):
        pass

    def _call_endpoint(self, library):
        return self.client.delete(f"/{VERSION}/api/libraries/{library.id}/")
