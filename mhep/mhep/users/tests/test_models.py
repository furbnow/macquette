import pytest
from django.conf import settings

pytestmark = pytest.mark.django_db


def test_user_get_absolute_url(user: settings.AUTH_USER_MODEL):
    assert user.get_absolute_url() == f"/users/{user.username}/"


def test_user_organisations(user_with_org: settings.AUTH_USER_MODEL):
    assert user_with_org.organisations.all().count() == 1
