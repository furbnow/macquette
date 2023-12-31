from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APITestCase

from macquette.users.tests.factories import UserFactory

from ... import VERSION
from ...models import Assessment
from ..factories import AssessmentFactory, OrganisationFactory
from .helpers import CreateAssessmentTestsMixin


class TestListAssessmentsForOrganisation(APITestCase):
    def setUp(cls):
        cls.organisation = OrganisationFactory.create()
        cls.org_member = UserFactory.create()
        cls.organisation.members.add(cls.org_member)

    def test_returns_all_assessments_connected_to_organisation_if_admin(self):
        self.organisation.admins.add(self.org_member)

        a1 = AssessmentFactory.create(organisation=self.organisation)
        a2 = AssessmentFactory.create(organisation=self.organisation)

        AssessmentFactory.create()
        AssessmentFactory.create(organisation=OrganisationFactory.create())

        assert {*self.fetch_organisation_assessment_ids()} == {str(a1.id), str(a2.id)}

    def test_returns_only_own_assessments_connected_to_organisation(self):
        AssessmentFactory.create(organisation=self.organisation)
        a = AssessmentFactory.create(
            organisation=self.organisation, owner=self.org_member
        )

        AssessmentFactory.create(owner=self.org_member)
        AssessmentFactory.create(organisation=OrganisationFactory.create())

        assert self.fetch_organisation_assessment_ids() == [str(a.id)]

    def test_returns_only_assessments_connected_to_the_organisation(self):
        second_org = OrganisationFactory.create()
        second_org.members.add(self.org_member)
        second_org.admins.add(self.org_member)
        self.organisation.admins.add(self.org_member)

        a1 = AssessmentFactory.create(organisation=self.organisation)
        a2 = AssessmentFactory.create(organisation=self.organisation)

        AssessmentFactory.create(organisation=second_org)

        assert {*self.fetch_organisation_assessment_ids()} == {str(a1.id), str(a2.id)}

    def test_returns_structure_as_expected(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            assessment = AssessmentFactory.create(
                name="test assessment 1",
                description="test description",
                data={"foo": "bar"},
                owner=self.org_member,
                organisation=self.organisation,
            )

        self.client.force_authenticate(self.org_member)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        expected_result = {
            "id": f"{assessment.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "status": "In progress",
            "name": "test assessment 1",
            "description": "test description",
            "organisation": {
                "id": f"{self.organisation.pk}",
                "name": self.organisation.name,
            },
            "owner": {
                "id": f"{self.org_member.id}",
                "name": self.org_member.name,
                "email": self.org_member.email,
            },
        }

        assert expected_result == response.data.pop()

    def test_returns_404_for_bad_organisation_id(self):
        self.client.force_authenticate(self.org_member)
        response = self.client.get(f"/{VERSION}/api/organisations/2/assessments/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert {"detail": "Organisation not found"} == response.json()

    def test_doesnt_return_assessments_that_arent_connected_to_organisation(self):
        AssessmentFactory.create()

        assert len(self.fetch_organisation_assessment_ids()) == 0

    def test_doesnt_return_own_assessments_that_arent_connected_to_organisation(self):
        AssessmentFactory.create(owner=self.org_member)

        assert len(self.fetch_organisation_assessment_ids()) == 0

    def test_returns_forbidden_if_not_logged_in(self):
        AssessmentFactory.create(organisation=self.organisation)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert {
            "detail": "Authentication credentials were not provided."
        } == response.json()

    def test_returns_forbidden_if_listing_for_organisation_not_a_member_of(self):
        someone_else = UserFactory.create()
        self.client.force_authenticate(someone_else)

        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert {
            "detail": "You are not a member of the Organisation."
        } == response.json()

    def fetch_organisation_assessment_ids(self):
        self.client.force_authenticate(self.org_member)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        assert response.status_code == status.HTTP_200_OK
        return [assessment["id"] for assessment in response.data]


class TestCreateAssessmentForOrganisation(CreateAssessmentTestsMixin, APITestCase):
    """
    note that more tests are provided by the CreateAssessmentTestsMixin, since they are
    common with the tests for TestCreateAssessment (for an individual)
    """

    def post_to_create_endpoint(self, assessment):
        self.organisation = OrganisationFactory.create()
        self.organisation.members.add(self.user)

        return self.client.post(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/",
            assessment,
            format="json",
        )

    def test_sets_organisation(self):
        self.organisation = OrganisationFactory.create()
        self.organisation.members.add(self.user)

        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
        }

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/",
            new_assessment,
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED

        assessment = Assessment.objects.get(pk=response.data["id"])
        assert self.organisation == assessment.organisation

    def test_fails_if_not_a_member_of_organisation(self):
        self.organisation = OrganisationFactory.create()

        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
        }

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/",
            new_assessment,
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert {
            "detail": "You are not a member of the Organisation."
        } == response.json()
