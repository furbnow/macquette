import datetime

import pytest
import pytz
from rest_framework import status
from rest_framework.test import APITestCase

from mhep.organisations_api.tests.factories import OrganisationFactory
from mhep.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db  # enable DB and run each test in transaction


class TestListOrganisations(APITestCase):
    def test_shows_logged_in_users_organisations(self):
        me = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, pytz.UTC)
        )
        my_org = OrganisationFactory.create()
        my_org.members.add(me)
        my_org.admins.add(me)

        org_admin = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 13, 21, 0, 0, pytz.UTC)
        )
        my_org.members.add(org_admin)
        my_org.librarians.add(org_admin)

        OrganisationFactory.create()  # make another organisation: it shouldn't show up

        self.client.force_authenticate(me)
        response = self.client.get("/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            {
                "id": f"{my_org.id}",
                "name": my_org.name,
                "members": [
                    {
                        "id": f"{me.id}",
                        "name": me.name,
                        "email": me.email,
                        "is_admin": True,
                        "is_librarian": False,
                        "last_login": me.last_login.isoformat(),
                    },
                    {
                        "id": f"{org_admin.id}",
                        "name": org_admin.name,
                        "email": org_admin.email,
                        "is_admin": False,
                        "is_librarian": True,
                        "last_login": org_admin.last_login.isoformat(),
                    },
                ],
                "permissions": {
                    "can_add_remove_members": True,
                    "can_promote_demote_librarians": True,
                },
            }
        ]

        assert expected == response.json()

    def test_returns_forbidden_if_not_logged_in(self):
        me = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, pytz.UTC)
        )
        my_org = OrganisationFactory.create()
        my_org.members.add(me)
        response = self.client.get("/api/organisations/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_returns_forbidden_if_not_an_admin(self):
        response = self.client.get("/api/organisations/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_if_last_login_is_none_shows_never(self):
        me = UserFactory.create(last_login=None)
        my_org = OrganisationFactory.create()
        my_org.members.add(me)
        my_org.admins.add(me)

        self.client.force_authenticate(me)
        response = self.client.get("/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        assert "never" == response.data[0]["members"][0]["last_login"]


class TestListOrganisationsPermissions(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = OrganisationFactory.create()

        cls.member_1 = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, pytz.UTC)
        )
        cls.org.members.add(cls.member_1)

        cls.org_admin = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 13, 21, 0, 0, pytz.UTC)
        )
        cls.org.members.add(cls.org_admin)
        cls.org.admins.add(cls.org_admin)

    def test_shows_permissions_for_logged_in_admin(self):
        self.client.force_authenticate(self.org_admin)

        self._assert_permissions(
            self.client.get("/api/organisations/"),
            {"can_add_remove_members": True, "can_promote_demote_librarians": True},
        )

    def _assert_permissions(self, response, expected_permissions):
        expected_members = [
            {
                "id": f"{self.member_1.id}",
                "name": self.member_1.name,
                "email": self.member_1.email,
                "is_admin": False,
                "is_librarian": False,
                "last_login": self.member_1.last_login.isoformat(),
            },
            {
                "id": f"{self.org_admin.id}",
                "name": self.org_admin.name,
                "email": self.org_admin.email,
                "is_admin": True,
                "is_librarian": False,
                "last_login": self.org_admin.last_login.isoformat(),
            },
        ]

        assert response.data[0]["members"] == expected_members
        assert response.data[0]["permissions"] == expected_permissions
