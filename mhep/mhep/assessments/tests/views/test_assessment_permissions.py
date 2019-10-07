from rest_framework.test import APITestCase
from rest_framework import status

from mhep.assessments.tests.factories import AssessmentFactory, OrganisationFactory
from mhep.users.tests.factories import UserFactory


class GetPermissionTestsMixin():
    def test_owner_who_isnt_organisation_member_can_access(self):
        assessment = AssessmentFactory.create()
        self.client.force_authenticate(assessment.owner)

        self.call_endpoint_and_assert(
            assessment,
            True,
        )

    def test_organisation_member_who_isnt_owner_can_access(self):
        organisation = OrganisationFactory.create()
        assessment = AssessmentFactory.create(organisation=organisation)

        org_member = UserFactory.create()
        organisation.members.add(org_member)

        self.client.force_authenticate(org_member)

        self.call_endpoint_and_assert(
            assessment,
            True,
        )

    def test_unauthenticated_user_cannot_access(self):
        assessment = AssessmentFactory.create()

        self.call_endpoint_and_assert(
            assessment,
            False,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_and_isnt_organisation_member_cannot_access(self):
        assessment = AssessmentFactory.create()

        non_owner = UserFactory.create()

        self.client.force_authenticate(non_owner)

        self.call_endpoint_and_assert(
            assessment,
            False,
            "You do not have permission to perform this action."
        )


class TestGetAssessmentPermissions(GetPermissionTestsMixin, APITestCase):
    def call_endpoint_and_assert(self, assessment, expect_permit, *args):
        response = self.client.get("/api/v1/assessments/{}/".format(assessment.id))

        if expect_permit:
            assert status.HTTP_200_OK == response.status_code
        else:
            assert status.HTTP_403_FORBIDDEN == response.status_code

        if len(args) > 0:
            expected_error_detail = args[0]
            assert {"detail": expected_error_detail} == response.json()


class TestUpdateAssessmentPermissions(GetPermissionTestsMixin, APITestCase):
    def call_endpoint_and_assert(self, assessment, expect_permit, *args):
        update_fields = {
            "data": {"new": "data"},
        }

        response = self.client.patch(
            "/api/v1/assessments/{}/".format(assessment.id),
            update_fields,
            format="json",
        )

        if expect_permit:
            assert status.HTTP_204_NO_CONTENT == response.status_code
        else:
            assert status.HTTP_403_FORBIDDEN == response.status_code

        if len(args) > 0:
            expected_error_detail = args[0]
            assert {"detail": expected_error_detail} == response.json()


class TestDeleteAssessmentPermissions(GetPermissionTestsMixin, APITestCase):
    def call_endpoint_and_assert(self, assessment, expect_permit, *args):
        response = self.client.delete("/api/v1/assessments/{}/".format(assessment.id))

        if expect_permit:
            assert status.HTTP_204_NO_CONTENT == response.status_code
        else:
            assert status.HTTP_403_FORBIDDEN == response.status_code

        if len(args) > 0:
            expected_error_detail = args[0]
            assert {"detail": expected_error_detail} == response.json()
