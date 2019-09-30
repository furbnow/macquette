from typing import Any, Sequence
from factory import DjangoModelFactory, Faker, post_generation

from mhep.assessments.models import Assessment, Library, Organisation


class AssessmentFactory(DjangoModelFactory):
    name = "Test assessment"
    description = "Test description"
    status = "In progress"
    data = {}

    class Meta:
        model = Assessment


class LibraryFactory(DjangoModelFactory):
    name = "Standard Library - exampleuser"
    type = "generation_measures"
    data = {}

    class Meta:
        model = Library


class OrganisationFactory(DjangoModelFactory):
    "Creates an Organisation with 1 member and 1 assessment"
    name = Faker("company")

    @post_generation
    def assessments(self, create: bool, extracted: Sequence[Any], **kwargs):
        self.assessments.add(AssessmentFactory.create())

    @post_generation
    def members(self, create: bool, extracted: Sequence[Any], **kwargs):
        from mhep.users.tests.factories import UserFactory
        self.members.add(UserFactory.create())

    class Meta:
        model = Organisation
