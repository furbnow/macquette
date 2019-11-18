import pytest

from django.db.utils import IntegrityError


from .. import VERSION
from ..models import Library, Organisation
from ..tests.factories import LibraryFactory, UserFactory, OrganisationFactory

pytestmark = pytest.mark.django_db


def test_organisation_assessments(organisation_with_extras: Organisation):
    assert organisation_with_extras.assessments.all().count() == 1


def test_organisations_related_name_on_user_model():
    user = UserFactory.create()
    org = OrganisationFactory.create()

    org.members.add(user)
    # `Organisation.members` is the forward relationship
    # `User.{version}_organisations` is the reverse

    assert getattr(user, f"{VERSION}_organisations").all().count() == 1


def test_libraries_related_name_on_user_model():
    user = UserFactory.create()

    LibraryFactory.create(owner_user=user, owner_organisation=None)

    # `Library.owner_user` is the forward relationship
    # `User.{version}_libraries` is the reverse

    assert getattr(user, f"{VERSION}_libraries").all().count() == 1


def test_libraries_related_name_on_organisation_model():
    org = OrganisationFactory.create()

    LibraryFactory.create(owner_organisation=org, owner_user=None)

    # `Library.owner_organisation` is the forward relationship
    # `Organisation.libraries` is the reverse

    assert org.libraries.all().count() == 1


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
