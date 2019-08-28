from rest_framework.test import APITestCase
from rest_framework import status


class TestListOrganisationAssessments(APITestCase):
    def test_list_organisation_assessments(self):
        response = self.client.get("/api/v1/organisations/1/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert [] == response.data


class TestListMyOrganisations(APITestCase):
    def test_list_organisation_assessments(self):
        response = self.client.get("/api/v1/organisations/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            {
                "id": "1",
                "name": "Carbon Coop",
                "assessments": 0,
                "members": [
                    {
                        "userid": "1",
                        "name": "localadmin",
                        "lastactive": "?"
                    }
                ]
            }
        ]

        assert expected == response.data
