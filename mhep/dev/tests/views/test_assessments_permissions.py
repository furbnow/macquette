from rest_framework import status
from rest_framework.test import APITestCase

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import AssessmentFactory, OrganisationFactory


class AssessmentPermissionTestsMixin:
    def test_owner_who_isnt_organisation_member_can_access(self):
        assessment = AssessmentFactory.create()
        self.client.force_authenticate(assessment.owner)

        response = self._call_endpoint(assessment)
        self._assert_success(response)

    def test_organisation_member_who_isnt_owner_cannot_access(self):
        organisation = OrganisationFactory.create()
        assessment = AssessmentFactory.create(organisation=organisation)

        org_member = UserFactory.create()
        organisation.members.add(org_member)

        self.client.force_authenticate(org_member)

        response = self._call_endpoint(assessment)
        self._assert_error(response, status.HTTP_404_NOT_FOUND)

    def test_organisation_admin_who_isnt_owner_can_access(self):
        organisation = OrganisationFactory.create()
        assessment = AssessmentFactory.create(organisation=organisation)

        org_member = UserFactory.create()
        organisation.members.add(org_member)
        organisation.admins.add(org_member)

        self.client.force_authenticate(org_member)

        response = self._call_endpoint(assessment)
        self._assert_success(response)

    def test_unauthenticated_user_cannot_access(self):
        assessment = AssessmentFactory.create()

        response = self._call_endpoint(assessment)
        self._assert_error(response, status.HTTP_403_FORBIDDEN)

    def test_user_who_isnt_owner_and_isnt_organisation_member_cannot_access(self):
        assessment = AssessmentFactory.create()

        non_owner = UserFactory.create()

        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(assessment)
        self._assert_error(response, status.HTTP_404_NOT_FOUND)

    def test_user_who_is_not_admin_can_access_if_assessment_shared(self):
        """Users should be able to access assessments that are shared with them."""

        unrelated_user = UserFactory.create()
        assessment = AssessmentFactory.create(shared_with=[unrelated_user])

        self.client.force_authenticate(unrelated_user)

        response = self._call_endpoint(assessment)
        self._assert_success(response)


class TestGetAssessmentPermissions(AssessmentPermissionTestsMixin, APITestCase):
    def _call_endpoint(self, assessment):
        return self.client.get(f"/{VERSION}/api/assessments/{assessment.id}/")

    def _assert_success(self, response):
        assert status.HTTP_200_OK == response.status_code

    def _assert_error(self, response, expected_status_code):
        assert expected_status_code == response.status_code


class TestUpdateAssessmentPermissions(AssessmentPermissionTestsMixin, APITestCase):
    def _call_endpoint(self, assessment):
        update_fields = {"data": {"new": "data"}}

        return self.client.patch(
            f"/{VERSION}/api/assessments/{assessment.id}/", update_fields, format="json"
        )

    def _assert_success(self, response):
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def _assert_error(self, response, expected_status_code):
        assert expected_status_code == response.status_code


class TestDeleteAssessmentPermissions(AssessmentPermissionTestsMixin, APITestCase):
    def _call_endpoint(self, assessment):
        return self.client.delete(f"/{VERSION}/api/assessments/{assessment.id}/")

    def _assert_success(self, response):
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def _assert_error(self, response, expected_status_code):
        assert expected_status_code == response.status_code
