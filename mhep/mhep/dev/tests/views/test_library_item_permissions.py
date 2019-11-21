from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import LibraryFactory, OrganisationFactory


class CommonMixin():
    def _assert_error(self, response, expected_status, expected_detail):
        assert expected_status == response.status_code
        assert {"detail": expected_detail} == response.json()

    def create_library(self, *args, **kwargs):
        return LibraryFactory.create(
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"}},
            *args, **kwargs)


class TestCreateLibraryItemPermissions(CommonMixin, APITestCase):
    def test_owner_can_create_library_item(self):
        library = self.create_library()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_create_library_item(self):
        library = self.create_library()
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_create_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "Not found.",
        )

    def test_member_of_organisation_can_create_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(
            owner_organisation=organisation,
            owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_member_cannot_create_a_library_item_in_organisation(self):
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
        item_data = {
            "tag": "new_tag",
            "item": {
                "name": "bar",
            }
        }

        return self.client.post(
            f"/{VERSION}/api/libraries/{library.id}/items/",
            item_data,
            format="json"
        )


class TestUpdateLibraryItemPermissions(CommonMixin, APITestCase):
    def test_owner_can_update_library(self):
        library = self.create_library()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_update_library_item(self):
        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_update_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "Not found.",
        )

    def test_member_of_organisation_can_update_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(
            owner_organisation=organisation,
            owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_member_cannot_update_a_library_item_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = self.create_library(
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
        replacement_data = {
            "name": "bar",
            "other": "data",
        }

        return self.client.put(
            f"/{VERSION}/api/libraries/{library.id}/items/tag1/",
            replacement_data,
            format="json"
        )


class TestDeleteLibraryItemPermissions(CommonMixin, APITestCase):
    def test_owner_can_delete_library_item(self):
        library = self.create_library()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_delete_library_item(self):
        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_delete_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "Not found.",
        )

    def test_member_of_organisation_can_delete_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=organisation,
            owner_user=None,
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"}},
        )
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_member_cannot_delete_a_library_item_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=org_with_no_members,
            owner_user=None,
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"}},
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
        return self.client.delete(f"/{VERSION}/api/libraries/{library.id}/items/tag2/")
