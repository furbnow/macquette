import pytest

from ... import VERSION
from ...tests.factories import OrganisationFactory
from ...tests.factories import ReportTemplateFactory
from mhep.users.tests.factories import UserFactory


@pytest.mark.django_db
def test_api_endpoint_generates_a_pdf(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt, members=[user])

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/organisations/{org.pk}/report/",
        {
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:8] == b"%PDF-1.7"


@pytest.mark.django_db
def test_api_endpoint_has_preview_function(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt, members=[user])

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/organisations/{org.pk}/report/",
        {
            "preview": True,
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/html"
    assert "Some text" in response.content.decode("utf-8")


@pytest.mark.django_db
def test_api_endpoint_includes_org_data_in_context(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="{{ org.name }}: {{ org.bg_colour }}")
    org = OrganisationFactory(
        report=rt,
        report_vars={"bg_colour": "#000"},
        members=[user],
    )

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/organisations/{org.pk}/report/",
        {
            "preview": True,
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/html"
    assert f"{org.name}: #000" in response.content.decode("utf-8")


@pytest.mark.django_db
def test_api_endpoint_only_works_for_org_members(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt)

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/organisations/{org.pk}/report/",
        {
            "preview": True,
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 403
