from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory
from mhep.assessments.tests.factories import AssessmentFactory, OrganisationFactory


class TestListAssessmentsForOrganisation(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.organisation = OrganisationFactory.create()
        cls.org_member = UserFactory.create()
        cls.organisation.members.add(cls.org_member)
        super().setUpClass()

    def test_returns_all_assessments_connected_to_organisation(self):
        AssessmentFactory.create(organisation=self.organisation)
        AssessmentFactory.create(organisation=self.organisation)

        self.call_and_assert_number_of_returns_assessments(2)

    def test_returns_structure_as_expected(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            assessment = AssessmentFactory.create(
                    name="test assessment 1",
                    description="test description",
                    data={"foo": "bar"},
                    openbem_version="10.1.1",
                    owner=self.org_member,
                    organisation=self.organisation
            )

        self.client.force_authenticate(self.org_member)
        response = self.client.get(f"/api/v1/organisations/{self.organisation.pk}/assessments/")

        expected_result = {
            "id": "{}".format(assessment.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description",
            "author": self.org_member.username,
            "userid": f"{self.org_member.id}",
        }

        assert expected_result == response.data.pop()

    def test_returns_404_for_bad_organisation_id(self):
        self.client.force_authenticate(self.org_member)
        response = self.client.get("/api/v1/organisations/2/assessments/")

        assert status.HTTP_404_NOT_FOUND == response.status_code
        assert {"detail": "Organisation not found"} == response.json()

    def test_doesnt_return_assessments_that_arent_connected_to_organisation(self):
        AssessmentFactory.create()

        self.call_and_assert_number_of_returns_assessments(0)

    def test_doesnt_return_own_assessments_that_arent_connected_to_organisation(self):
        AssessmentFactory.create(owner=self.org_member)

        self.call_and_assert_number_of_returns_assessments(0)

    def call_and_assert_number_of_returns_assessments(self, expectedAssessmentCount):
        self.client.force_authenticate(self.org_member)
        response = self.client.get(f"/api/v1/organisations/{self.organisation.pk}/assessments/")

        assert response.status_code == status.HTTP_200_OK
        assert expectedAssessmentCount == len(response.data)
