from rest_framework import status
from rest_framework.test import APITestCase

from macquette.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import LibraryFactory, OrganisationFactory
from .helpers import assert_error


class TestPromoteAsLibrarianPermissions(APITestCase):
    def setUp(cls):
        cls.org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.member_1 = UserFactory.create()
        cls.member_2 = UserFactory.create()

        cls.org.members.add(cls.org_admin)
        cls.org.members.add(cls.member_1)
        cls.org.members.add(cls.member_2)

        cls.org.admins.add(cls.org_admin)

    def test_organisation_admin_can_promote_user_as_librarian(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.org, self.member_1)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_user_cannot_promote_user_as_librarian(self):
        response = self._call_endpoint(self.org, self.member_1)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_promote_user_as_librarian(self):
        self.client.force_authenticate(self.member_1)
        response = self._call_endpoint(self.org, self.member_2)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, user_to_promote):
        return self.client.post(
            f"/{VERSION}/api/organisations/{org.id}/librarians/{user_to_promote.id}/"
        )


class TestDemoteAsLibrarianPermissions(APITestCase):
    def setUp(cls):
        cls.org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.normal_member = UserFactory.create()
        cls.librarian = UserFactory.create()

        cls.org.members.add(cls.org_admin)
        cls.org.members.add(cls.normal_member)
        cls.org.members.add(cls.librarian)

        cls.org.admins.add(cls.org_admin)
        cls.org.librarians.add(cls.librarian)

    def test_organisation_admin_can_demote_user_as_librarian(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.org, self.librarian)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_user_cannot_demote_user_as_librarian(self):
        response = self._call_endpoint(self.org, self.librarian)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_demote_user_as_librarian(self):
        self.client.force_authenticate(self.normal_member)
        response = self._call_endpoint(self.org, self.librarian)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, user_to_demote):
        return self.client.delete(
            f"/{VERSION}/api/organisations/{org.id}/librarians/{user_to_demote.id}/"
        )


class TestShareOrganisationLibrariesPermissions(APITestCase):
    def setUp(cls):
        cls.my_org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.my_org.members.add(cls.org_admin)
        cls.my_org.admins.add(cls.org_admin)

        cls.other_org = OrganisationFactory.create()
        cls.library = LibraryFactory.create(
            owner_organisation=cls.my_org, owner_user=None
        )

    def test_organisation_admin_can_share_organisation_library(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.my_org, self.library, self.other_org)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_user_cannot_share_organisation_library(self):
        response = self._call_endpoint(self.my_org, self.library, self.other_org)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_share_organisation_library(self):
        normal_member = UserFactory.create()
        self.my_org.members.add(normal_member)

        self.client.force_authenticate(normal_member)
        response = self._call_endpoint(self.my_org, self.library, self.other_org)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, lib, share_to_org):
        return self.client.post(
            f"/{VERSION}/api/organisations/{org.id}/libraries/{lib.id}/shares/{share_to_org.id}/"
        )


class TestAddMemberPermissions(APITestCase):
    def setUp(cls):
        cls.org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.member = UserFactory.create()
        cls.non_member = UserFactory.create()

        cls.org.members.add(cls.org_admin)
        cls.org.members.add(cls.member)

        cls.org.admins.add(cls.org_admin)

    def test_organisation_admin_can_add_user_as_member(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.org, self.non_member)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_user_cannot_add_user_as_member(self):
        response = self._call_endpoint(self.org, self.non_member)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_add_user_as_member(self):
        self.client.force_authenticate(self.member)
        response = self._call_endpoint(self.org, self.non_member)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, user_to_add):
        return self.client.post(
            f"/{VERSION}/api/organisations/{org.id}/members/{user_to_add.id}/"
        )


class TestRemoveMemberPermissions(APITestCase):
    def setUp(cls):
        cls.org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.member = UserFactory.create()

        cls.org.members.add(cls.org_admin)
        cls.org.members.add(cls.member)

        cls.org.admins.add(cls.org_admin)

    def test_organisation_admin_can_remove_user_as_member(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.org, self.member)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_user_cannot_remove_user_as_member(self):
        response = self._call_endpoint(self.org, self.member)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_remove_user_as_member(self):
        self.client.force_authenticate(self.member)
        response = self._call_endpoint(self.org, self.member)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, user_to_demote):
        return self.client.delete(
            f"/{VERSION}/api/organisations/{org.id}/members/{user_to_demote.id}/"
        )


class TestUnshareOrganisationLibrariesPermissions(APITestCase):
    def setUp(cls):
        cls.my_org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.my_org.members.add(cls.org_admin)
        cls.my_org.admins.add(cls.org_admin)

        cls.other_org = OrganisationFactory.create()
        cls.shared_library = LibraryFactory.create(
            owner_organisation=cls.my_org, owner_user=None
        )
        cls.shared_library.shared_with.add(cls.other_org)

    def test_organisation_admin_can_share_organisation_library(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.my_org, self.shared_library, self.other_org)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_user_cannot_share_organisation_library(self):
        response = self._call_endpoint(self.my_org, self.shared_library, self.other_org)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_share_organisation_library(self):
        normal_member = UserFactory.create()
        self.my_org.members.add(normal_member)

        self.client.force_authenticate(normal_member)
        response = self._call_endpoint(self.my_org, self.shared_library, self.other_org)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, lib, share_to_org):
        return self.client.delete(
            f"/{VERSION}/api/organisations/{org.id}/libraries/{lib.id}/shares/{share_to_org.id}/"
        )


class TestListOrganisationLibrarySharesPermissions(APITestCase):
    def setUp(cls):
        cls.my_org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()
        cls.my_org.members.add(cls.org_admin)
        cls.my_org.admins.add(cls.org_admin)

        cls.other_org = OrganisationFactory.create()
        cls.shared_library = LibraryFactory.create(
            owner_organisation=cls.my_org, owner_user=None
        )
        cls.shared_library.shared_with.add(cls.other_org)

    def test_organisation_admin_can_list_library_shares(self):
        self.client.force_authenticate(self.org_admin)
        response = self._call_endpoint(self.my_org, self.shared_library)
        assert response.status_code == status.HTTP_200_OK

    def test_unauthenticated_user_cannot_list_library_shares(self):
        response = self._call_endpoint(self.my_org, self.shared_library)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_list_library_shares(self):
        normal_member = UserFactory.create()
        self.my_org.members.add(normal_member)

        self.client.force_authenticate(normal_member)
        response = self._call_endpoint(self.my_org, self.shared_library)
        assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, lib):
        return self.client.get(
            f"/{VERSION}/api/organisations/{org.id}/libraries/{lib.id}/shares/"
        )
