from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import OrganisationFactory


class CommonMixin():
    def _assert_error(self, response, expected_status, expected_detail):
        assert expected_status == response.status_code
        assert {"detail": expected_detail} == response.json()


class TestPromoteAsLibrarianPermissions(CommonMixin, APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

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
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_promote_user_as_librarian(self):
        response = self._call_endpoint(self.org, self.member_1)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_promote_user_as_librarian(self):
        self.client.force_authenticate(self.member_1)
        response = self._call_endpoint(self.org, self.member_2)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, user_to_promote):
        return self.client.post(
            f"/{VERSION}/api/organisations/{org.id}/librarians/{user_to_promote.id}/"
        )


class TestDemoteAsLibrarianPermissions(CommonMixin, APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

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
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_demote_user_as_librarian(self):
        response = self._call_endpoint(self.org, self.librarian)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_org_member_who_is_not_an_org_admin_cannot_demote_user_as_librarian(self):
        self.client.force_authenticate(self.normal_member)
        response = self._call_endpoint(self.org, self.librarian)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of the Organisation.",
        )

    def _call_endpoint(self, org, user_to_demote):
        return self.client.delete(
            f"/{VERSION}/api/organisations/{org.id}/librarians/{user_to_demote.id}/"
        )
