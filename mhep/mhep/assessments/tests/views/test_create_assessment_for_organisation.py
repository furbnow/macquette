from mhep.assessments.models import Assessment
from mhep.assessments.tests.factories import OrganisationFactory
from mhep.users.tests.factories import UserFactory

from rest_framework import status
from rest_framework.test import APITestCase


class TestCreateAssessmentInOrganisation(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Assessment.objects.all().delete()

    def test_create_assessment(self):
        organisation = OrganisationFactory.create()
        user = UserFactory.create()
        user.organisations.add(organisation)

        self.client.force_authenticate(user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
            "openbem_version": "10.1.1",
        }

        response = self.client.post(
            f"/api/v1/organisations/{organisation.pk}/assessments/",
            new_assessment,
            format="json"
        )

        assert status.HTTP_201_CREATED == response.status_code

        assessment = Assessment.objects.get(pk=response.data["id"])
        assert organisation == assessment.organisation
