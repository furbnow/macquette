from django.contrib.auth import get_user_model


from rest_framework.test import APITestCase

from ... import VERSION

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
