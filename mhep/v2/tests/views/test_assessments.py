from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from freezegun import freeze_time
from rest_framework import exceptions, status
from rest_framework.test import APITestCase

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ...models import Assessment
from ..factories import AssessmentFactory, ImageFactory, OrganisationFactory
from .mixins import CreateAssessmentTestsMixin

User = get_user_model()


class TestCreateAssessment(CreateAssessmentTestsMixin, APITestCase):
    """
    note that the actual tests are provided by the CreateAssessmentTestsMixin, since
    they are common with the tests for TestCreateAssessmentForOrganisation
    """

    def post_to_create_endpoint(self, assessment):
        return self.client.post(
            f"/{VERSION}/api/assessments/", assessment, format="json"
        )


class TestListAssessments(APITestCase):
    def test_returns_assessments_with_expected_result_structure(self):
        user = UserFactory.create()
        self.client.force_authenticate(user)

        with freeze_time("2019-06-01T16:35:34Z"):
            a1 = AssessmentFactory.create(
                name="test assessment 1",
                description="test description",
                data={"foo": "bar"},
                owner=user,
            )

        response = self.client.get(f"/{VERSION}/api/assessments/")

        expected_structure = {
            "id": f"{a1.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "status": "In progress",
            "name": "test assessment 1",
            "description": "test description",
            "organisation": None,
            "owner": {
                "id": f"{user.id}",
                "name": user.name,
                "email": user.email,
            },
        }

        assert expected_structure == response.data.pop()

    def test_returns_organisation_assessments(self):
        user = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(user)

        self.client.force_authenticate(user)

        with freeze_time("2019-06-01T16:35:34Z"):
            a1 = AssessmentFactory.create(
                name="test assessment 1",
                description="test description",
                data={"foo": "bar"},
                owner=user,
                organisation=organisation,
            )

        response = self.client.get(f"/{VERSION}/api/assessments/")

        expected_structure = {
            "id": f"{a1.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "status": "In progress",
            "name": "test assessment 1",
            "description": "test description",
            "organisation": {
                "id": f"{organisation.pk}",
                "name": organisation.name,
            },
            "owner": {
                "id": f"{user.id}",
                "name": user.name,
                "email": user.email,
            },
        }
        assert expected_structure == response.data.pop()

    def test_returns_all_assessments_in_connected_organisation_if_admin(self):
        user = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(user)
        organisation.admins.add(user)

        self.client.force_authenticate(user)

        AssessmentFactory.create(owner=user)
        AssessmentFactory.create(owner=user)

        AssessmentFactory.create(organisation=organisation)

        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert len(response.data) == 3

    def test_returns_own_assessments_in_connected_organisation_if_not_admin(self):
        user = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(user)

        self.client.force_authenticate(user)

        AssessmentFactory.create(owner=user)
        AssessmentFactory.create(owner=user)

        AssessmentFactory.create(organisation=organisation)

        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert len(response.data) == 2

    def test_only_returns_non_organisation_assessments_for_logged_in_user(self):
        me = UserFactory.create()
        someone_else = UserFactory.create()
        self.client.force_authenticate(me)

        AssessmentFactory.create(owner=me)
        AssessmentFactory.create(owner=me)
        AssessmentFactory.create(owner=someone_else)

        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert len(response.data) == 2

    def test_returns_assessments_shared_with(self):
        user = UserFactory.create()
        unrelated_user = UserFactory.create()

        self.client.force_authenticate(user)

        AssessmentFactory.create(owner=user, shared_with=[unrelated_user])
        response = self.client.get(f"/{VERSION}/api/assessments/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_returns_forbidden_if_not_logged_in(self):
        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_num_queries(self):
        user = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(user)
        organisation.admins.add(user)

        self.client.force_authenticate(user)

        for _n in range(30):
            AssessmentFactory.create(organisation=organisation)

        with CaptureQueriesContext(connection) as captured_queries:
            self.client.get(f"/{VERSION}/api/assessments/")

        assert len(captured_queries) < 6


class TestGetAssessment(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()

    def test_returns_result_structured_as_expected(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = AssessmentFactory.create(
                owner=self.me,
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
            )

        i = ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")
        assert response.status_code == status.HTTP_200_OK

        expected = {
            "id": f"{a.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "status": "In progress",
            "name": "test name",
            "description": "test description",
            "owner": {
                "id": f"{self.me.id}",
                "name": self.me.name,
                "email": self.me.email,
            },
            "organisation": None,
            "images": [
                {
                    "id": i.id,
                    "url": i.image.url,
                    "width": i.width,
                    "height": i.height,
                    "thumbnail_url": i.thumbnail.url,
                    "thumbnail_width": i.thumbnail_width,
                    "thumbnail_height": i.thumbnail_height,
                    "note": i.note,
                    "is_featured": False,
                }
            ],
            "data": {"foo": "bar"},
        }
        assert expected == response.data

    def test_assessment_without_data_returns_sensible_default(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = AssessmentFactory.create(
                owner=self.me, name="test name", description="", data={}
            )

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")
        assert response.status_code == status.HTTP_200_OK

        expected = {
            "id": f"{a.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": "test name",
            "organisation": None,
            # defaults:
            "description": "",
            "owner": {
                "id": f"{self.me.id}",
                "name": self.me.name,
                "email": self.me.email,
            },
            "status": "In progress",
            "images": [],
            "data": {},
        }
        assert expected == response.data

    def test_returns_404_for_bad_id(self):
        response = self.client.get(f"/{VERSION}/api/assessments/bad-id/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_can_request_multiply_shared_assessment(self):
        other1 = UserFactory.create()
        other2 = UserFactory.create()
        a = AssessmentFactory.create(owner=self.me, shared_with=[other1, other2])

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")

        assert response.status_code == status.HTTP_200_OK

    def test_structure_of_featured_and_normal_image(self):
        a = AssessmentFactory.create(
            owner=self.me,
            name="test name",
            description="test description",
            data={"foo": "bar"},
            status="In progress",
        )

        i1 = ImageFactory.create(assessment=a)
        i2 = ImageFactory.create(assessment=a)

        a.featured_image = i1
        a.save()

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            {
                "id": i2.id,
                "url": i2.image.url,
                "width": i2.width,
                "height": i2.height,
                "thumbnail_url": i2.thumbnail.url,
                "thumbnail_width": i2.thumbnail_width,
                "thumbnail_height": i2.thumbnail_height,
                "note": i2.note,
                "is_featured": False,
            },
            {
                "id": i1.id,
                "url": i1.image.url,
                "width": i1.width,
                "height": i1.height,
                "thumbnail_url": i1.thumbnail.url,
                "thumbnail_width": i1.thumbnail_width,
                "thumbnail_height": i1.thumbnail_height,
                "note": i1.note,
                "is_featured": True,
            },
        ]
        assert expected == response.data["images"]


class TestUpdateAssessment(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()

    def setUp(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            self.assessment = AssessmentFactory.create(
                owner=self.me,
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
            )

    def test_updates_and_returns_as_expected(self):
        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"data": {"new": "data"}, "status": "Complete"}

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert response.content == b""

        updated_assessment = Assessment.objects.get(pk=self.assessment.pk)

        assert {"new": "data"} == updated_assessment.data
        assert updated_assessment.status == "Complete"

        assert updated_assessment.updated_at.isoformat() == "2019-07-13T12:10:12+00:00"

    def test_fails_if_data_field_is_a_string(self):
        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"data": {"foo string"}}
            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {
            "data": [
                exceptions.ErrorDetail(
                    string="This field is not a dict.", code="invalid"
                )
            ]
        }

    def test_update_assessment_data_fails_if_assessment_is_complete(self):
        self.assessment.status = "Complete"
        self.assessment.save()

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"data": {"new": "data"}}

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {
            "detail": "can't update data when status is 'complete'"
        }

    def test_assessment_status_can_change_from_complete_to_in_progress(self):
        self.assessment.status = "Complete"
        self.assessment.save()

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"status": "In progress"}

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestDestroyAssessment(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()

    def setUp(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            self.assessment = AssessmentFactory.create(
                owner=self.me,
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
            )

    def test_returns_204_if_user_is_owner(self):
        a = AssessmentFactory.create(
            owner=self.me,
            name="test name",
            description="test description",
            data={"foo": "bar"},
            status="In progress",
        )

        assessment_count = Assessment.objects.count()

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/assessments/{a.pk}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert response.content == b""

        assert (assessment_count - 1) == Assessment.objects.count()


class TestDuplicateAssessment(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.me = UserFactory.create()
        cls.other = UserFactory.create()

    def setUp(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            self.assessment = AssessmentFactory.create(
                owner=self.me, shared_with=[self.other]
            )

    def test_returns_200_if_user_is_owner(self):
        assessment_count = Assessment.objects.count()

        self.client.force_authenticate(self.me)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{self.assessment.pk}/duplicate/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert (assessment_count + 1) == Assessment.objects.count()

    def test_new_owner(self):
        self.client.force_authenticate(self.other)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{self.assessment.pk}/duplicate/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["owner"]["id"] == str(self.other.id)

    def test_returns_404_if_user_is_not_owner(self):
        other_user = UserFactory.create()
        assessment_count = Assessment.objects.count()

        self.client.force_authenticate(other_user)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{self.assessment.pk}/duplicate/"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert assessment_count == Assessment.objects.count()
        assert self.assessment.data == Assessment.objects.last().data
