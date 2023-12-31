from rest_framework import status
from rest_framework.test import APITestCase

from macquette.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import LibraryFactory, OrganisationFactory
from .helpers import assert_error


class SetUpMixin:
    @classmethod
    def setUpTestData(cls):
        cls.my_org = OrganisationFactory.create()
        cls.other_org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()

        cls.my_org.members.add(cls.org_admin)
        cls.my_org.admins.add(cls.org_admin)

    def setUp(self):
        self.library = LibraryFactory.create(
            owner_organisation=self.my_org, owner_user=None
        )


class TestShareOrganisationLibrary(SetUpMixin, APITestCase):
    def test_can_share_library_with_other_organisation(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.library in self.other_org.libraries_shared_with.all()

    def test_returns_204_if_sharing_library_thats_already_shared_with_organisation(
        self,
    ):
        self.client.force_authenticate(self.org_admin)

        self.library.shared_with.add(self.other_org)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.library in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_other_organisation_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/9999/"
        )

        assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "can't share library with non-existent organisation: id=9999",
        )
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_library_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/9999"
            f"/shares/{self.other_org.id}/"
        )

        assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "organisation doesn't have a library with id=9999",
        )
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_library_id_exists_but_doesnt_belong_to_organisation(self):
        self.client.force_authenticate(self.org_admin)

        other_library = LibraryFactory.create()  # belongs to random user

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{other_library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"organisation doesn't have a library with id={other_library.id}",
        )
        assert self.library not in self.other_org.libraries_shared_with.all()


class TestUnshareOrganisationLibrary(SetUpMixin, APITestCase):
    def test_can_unshare_library_with_other_organisation(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_204_if_unsharing_library_thats_not_already_shared_with_organisation(
        self,
    ):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_404_is_sharing_organisation_id_does_not_exist(self):
        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/999/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert_error(response, status.HTTP_404_NOT_FOUND, "Organisation not found")

    def test_returns_404_if_other_organisation_id_doesnt_exist(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/9999/"
        )

        assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "can't share library with non-existent organisation: id=9999",
        )
        assert self.library in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_library_id_doesnt_exist(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/9999"
            f"/shares/{self.other_org.id}/"
        )

        assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "organisation doesn't have a library with id=9999",
        )
        assert self.library in self.other_org.libraries_shared_with.all()


class TestListOrganisationLibraryShares(SetUpMixin, APITestCase):
    def test_returns_organisations_a_library_is_shared_with(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}/shares/"
        )

        assert response.status_code == status.HTTP_200_OK
        expected = [{"id": f"{self.other_org.id}", "name": self.other_org.name}]

        assert expected == response.json()

    def test_returns_404_if_organisation_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)
        response = self.client.get(
            f"/{VERSION}/api/organisations/999/libraries/{self.library.id}/shares/"
        )

        assert_error(response, status.HTTP_404_NOT_FOUND, "Organisation not found")

    def test_returns_404_if_library_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/999/shares/"
        )

        assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            "organisation doesn't have a library with id=999",
        )
