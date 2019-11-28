from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory
from ... import VERSION
from ... import models
from .. import factories


class TestDeleteImage(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        super().setUpClass()

    def test_valid_image(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/images/{i1.pk}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert models.Image.objects.filter(pk=i1.id).count() == 0

    def test_not_my_assessment(self):
        someone_else = UserFactory.create()

        a = factories.AssessmentFactory.create(owner=someone_else)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/images/{i1.pk}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
