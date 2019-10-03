from typing import Any, Sequence
from factory import DjangoModelFactory, Faker, post_generation, SubFactory

from mhep.assessments.models import Assessment, Library, Organisation
from mhep.users.tests.factories import UserFactory


class AssessmentFactory(DjangoModelFactory):
    name = "Test assessment"
    description = "Test description"
    status = "In progress"
    data = {}
    owner = SubFactory(UserFactory)

    class Meta:
        model = Assessment


class LibraryFactory(DjangoModelFactory):
    name = "Standard Library - exampleuser"
    type = "generation_measures"
    data = {}

    class Meta:
        model = Library


class OrganisationFactory(DjangoModelFactory):
    name = Faker("company")

    class Meta:
        model = Organisation


class OrganisationWithExtrasFactory(OrganisationFactory):
    "Creates an Organisation with 1 member and 1 assessment"

    @post_generation
    def assessments(self, create: bool, extracted: Sequence[Any], **kwargs):
        from mhep.users.tests.factories import UserFactory
        self._assessment_owner = UserFactory.create()
        self.assessments.add(AssessmentFactory.create(owner=self._assessment_owner))

    @post_generation
    def members(self, create: bool, extracted: Sequence[Any], **kwargs):
        self.members.add(self._assessment_owner)
