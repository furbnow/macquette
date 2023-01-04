import datetime
from datetime import timezone

import pytest
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from mhep.users.models import User
from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import AssessmentFactory, OrganisationFactory

pytestmark = pytest.mark.django_db  # enable DB and run each test in transaction


class TestListOrganisations(APITestCase):
    def test_shows_logged_in_users_organisations(self):
        me = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, timezone.utc)
        )
        my_org = OrganisationFactory.create()

        org_admin = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 13, 21, 0, 0, timezone.utc)
        )
        my_org.members.add(org_admin)
        my_org.admins.add(org_admin)

        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(owner=me, organisation=my_org)
        my_org.members.add(me)
        my_org.librarians.add(me)

        OrganisationFactory.create()  # make another organisation: it shouldn't show up

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            {
                "id": f"{my_org.id}",
                "name": my_org.name,
                "assessments": 2,
                "members": [
                    {
                        "id": f"{me.id}",
                        "name": me.name,
                        "email": me.email,
                        "is_admin": False,
                        "is_librarian": True,
                        "last_login": me.last_login.isoformat(),
                    },
                    {
                        "id": f"{org_admin.id}",
                        "name": org_admin.name,
                        "email": org_admin.email,
                        "is_admin": True,
                        "is_librarian": False,
                        "last_login": org_admin.last_login.isoformat(),
                    },
                ],
                "permissions": {
                    "can_add_remove_members": False,
                    "can_promote_demote_librarians": False,
                },
            }
        ]

        assert expected == response.json()

    def test_returns_forbidden_if_not_logged_in(self):
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_if_last_login_is_none_shows_never(self):
        me = UserFactory.create(last_login=None)
        my_org = OrganisationFactory.create()
        my_org.members.add(me)

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        assert response.data[0]["members"][0]["last_login"] == "never"

    def test_number_of_assessments_only_includes_own_assessments_if_not_admin(self):
        me = UserFactory.create(last_login=None)
        my_org = OrganisationFactory.create()
        my_org.members.add(me)

        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(organisation=my_org)

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        assert response.data[0]["assessments"] == 2

    def test_number_of_assessments_includes_all_assessments_if_admin(self):
        me = UserFactory.create(last_login=None)
        my_org = OrganisationFactory.create()
        my_org.members.add(me)
        my_org.admins.add(me)

        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(organisation=my_org)

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        assert response.data[0]["assessments"] == 3


class TestListOrganisationsPermissions(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = OrganisationFactory.create()

        cls.member_1 = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, timezone.utc)
        )
        cls.org.members.add(cls.member_1)

        cls.org_admin = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 13, 21, 0, 0, timezone.utc)
        )
        cls.org.members.add(cls.org_admin)
        cls.org.admins.add(cls.org_admin)

    def test_shows_permissions_for_logged_in_member(self):
        self.client.force_authenticate(self.member_1)

        self._assert_permissions(
            self.client.get(f"/{VERSION}/api/organisations/"),
            {"can_add_remove_members": False, "can_promote_demote_librarians": False},
        )

    def test_shows_permissions_for_logged_in_admin(self):
        self.client.force_authenticate(self.org_admin)

        self._assert_permissions(
            self.client.get(f"/{VERSION}/api/organisations/"),
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


class TestInviteOrganisationMembers(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = OrganisationFactory.create()

        cls.org_admin = UserFactory.create()
        cls.org.members.add(cls.org_admin)
        cls.org.admins.add(cls.org_admin)

        cls.org_member = UserFactory()
        cls.org.members.add(cls.org_member)

        cls.non_member = UserFactory()

    def test_nonexistent_organisation_should_404(self):
        self.client.force_authenticate(self.org_member)

        response = self.client.post(f"/{VERSION}/api/organisations/234/members/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_organisation_when_not_admin_should_403(self):
        self.client.force_authenticate(self.org_member)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.pk}/members/",
            [{"name": "Fred Test", "email": "test@example.com"}],
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_input(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.pk}/members/",
            [{"userid": self.org_member.id}],
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(USE_AUTH_SERVICE=False)
    def test_invite_existing_user_adds_to_group(self):
        self.client.force_authenticate(self.org_admin)
        pre_count = User.objects.count()

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.pk}/members/",
            [{"email": self.non_member.email, "name": self.non_member.name}],
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.non_member in self.org.members.all()
        assert User.objects.count() == pre_count

    @override_settings(USE_AUTH_SERVICE=False)
    def test_invite_new_user_sends_email(self):
        self.client.force_authenticate(self.org_admin)
        pre_count = User.objects.count()

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.pk}/members/",
            [{"email": "testing+email+44@gmail.com", "name": "Name Surname"}],
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert "testing+email+44@gmail.com" in self.org.members.values_list(
            "email", flat=True
        )
        assert User.objects.count() == pre_count + 1
