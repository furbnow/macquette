import pytest

from django.db.utils import IntegrityError


from .. import VERSION
from ..models import Library, Organisation
from ..tests.factories import UserFactory, OrganisationFactory

pytestmark = pytest.mark.django_db


def test_organisation_assessments(organisation_with_extras: Organisation):
    assert organisation_with_extras.assessments.all().count() == 1


def test_organisations_related_name_on_user_model():
    user = UserFactory.create()
    org = OrganisationFactory.create()

    org.members.add(user)
    # Organisation.members is the forward relationship
    # and User.{version}_organisations is the reverse

    assert getattr(user, f"{VERSION}_organisations").all().count() == 1


class TestOrganisationOwner():
    def test_can_have_user_owner(self):
        Library.objects.create(
            owner_user=UserFactory.create(),
            owner_organisation=None,
        )

    def test_can_have_organisation_owner(self):
        Library.objects.create(
            owner_organisation=OrganisationFactory.create(),
            owner_user=None,
        )

    def test_can_have_no_owner(self):
        Library.objects.create(
            owner_organisation=None,
            owner_user=None,
        )

    def test_cannot_have_both_user_and_organisation_owner(self):
        with pytest.raises(IntegrityError):
            Library.objects.create(
                owner_user=UserFactory.create(),
                owner_organisation=OrganisationFactory.create(),
            )
