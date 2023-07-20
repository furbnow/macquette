import pytest
import requests

from macquette.users.tests.factories import UserFactory

from ... import VERSION
from ...tests.factories import (
    AssessmentFactory,
    OrganisationFactory,
    ReportTemplateFactory,
)


@pytest.mark.django_db()
def test_report_creation_redirects_to_a_pdf(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt, members=[user])
    assessment = AssessmentFactory(organisation=org, owner=user)

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/assessments/{assessment.pk}/reports/",
        {
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 303
    redirect_response = requests.get(response.headers["Location"], timeout=5)
    assert redirect_response.status_code == 200
    assert redirect_response.headers["content-type"] == "application/pdf"
    assert redirect_response.content[:8] == b"%PDF-1.7"


@pytest.mark.django_db()
def test_report_preview_generates_html(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt, members=[user])
    assessment = AssessmentFactory(organisation=org, owner=user)

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/assessments/{assessment.pk}/reports/preview",
        {
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/html"
    assert "Some text" in response.content.decode("utf-8")


@pytest.mark.django_db()
def test_report_preview_includes_org_data_in_context(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="{{ org.name }}: {{ org.bg_colour }}")
    org = OrganisationFactory(
        report=rt,
        report_vars={"bg_colour": "#000"},
        members=[user],
    )
    assessment = AssessmentFactory(organisation=org, owner=user)

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/assessments/{assessment.pk}/reports/preview",
        {
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/html"
    assert f"{org.name}: #000" in response.content.decode("utf-8")


@pytest.mark.django_db()
def test_report_creation_only_works_for_org_members(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt)
    assessment = AssessmentFactory(organisation=org, owner=user)

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/assessments/{assessment.pk}/reports/",
        {
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db()
def test_report_preview_only_works_for_org_members(client):
    user = UserFactory.create()
    rt = ReportTemplateFactory(template="Some text")
    org = OrganisationFactory(report=rt)
    assessment = AssessmentFactory(organisation=org, owner=user)

    client.force_login(user)
    response = client.post(
        f"/{VERSION}/api/assessments/{assessment.pk}/reports/preview",
        {
            "context": "{}",
            "graphs": "{}",
        },
        format="json",
    )

    assert response.status_code == 403
