from rest_framework.test import APITestCase
from rest_framework import status


class TestListOrganisationAssessments(APITestCase):
    def test_list_organisation_assessments(self):
        response = self.client.get("/api/v1/organisations/1/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert [] == response.data

    def test_create_organisation_assessment(self):
        new_assessment = {
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description 2",
        }

        response = self.client.post(
            "/api/v1/organisations/1/assessments/",
            new_assessment,
            format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert None is response.data


class TestListCreateOrganisations(APITestCase):
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

    def test_create_organisation(self):
        new_organisation = {
            "name": "new organisation",
        }

        response = self.client.post("/api/v1/organisations/", new_organisation, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert {"detail": "function not implemented"} == response.data
