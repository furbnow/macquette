from django.contrib.auth import get_user_model


from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ...models import Assessment
from ..factories import OrganisationFactory

from .mixins import CreateAssessmentTestsMixin

User = get_user_model()


class TestCreateAssessment(CreateAssessmentTestsMixin, APITestCase):
    """
    note that the actual tests are provided by the CreateAssessmentTestsMixin, since they are
    common with the tests for TestCreateAssessmentForOrganisation
    """
    def post_to_create_endpoint(self, assessment):
        return self.client.post(
            f"/{VERSION}/api/assessments/",
            assessment,
            format="json"
        )


class TestCreateAssessmentForOrganisation(CreateAssessmentTestsMixin, APITestCase):
    """
    note that more tests are provided by the CreateAssessmentTestsMixin, since they are
    common with the tests for TestCreateAssessment (for an individual)
    """
    def post_to_create_endpoint(self, assessment):
        organisation = OrganisationFactory.create()
        organisation.members.add(self.user)

        return self.client.post(
            f"/{VERSION}/api/organisations/{organisation.pk}/assessments/",
            assessment,
            format="json"
        )

    def test_sets_organisation(self):
        organisation = OrganisationFactory.create()
        organisation.members.add(self.user)

        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
            "openbem_version": "10.1.1",
        }

        response = self.client.post(
            f"/{VERSION}/api/organisations/{organisation.pk}/assessments/",
            new_assessment,
            format="json"
        )

        assert status.HTTP_201_CREATED == response.status_code

        assessment = Assessment.objects.get(pk=response.data["id"])
        assert organisation == assessment.organisation

    def test_fails_if_not_a_member_of_organisation(self):
        organisation = OrganisationFactory.create()

        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
            "openbem_version": "10.1.1",
        }

        response = self.client.post(
            f"/{VERSION}/api/organisations/{organisation.pk}/assessments/",
            new_assessment,
            format="json"
        )

        assert status.HTTP_403_FORBIDDEN == response.status_code
        assert {"detail": "You are not a member of the Organisation."} == response.json()
