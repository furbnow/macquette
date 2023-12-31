from collections.abc import Sequence
from typing import Any

import factory
from factory.django import DjangoModelFactory
from faker.providers import BaseProvider

from macquette.users.tests.factories import UserFactory

from ..models import Assessment, Image, Library, Organisation, Report, ReportTemplate


# create new provider class. Note that the class name _must_ be ``Provider``.
class Provider(BaseProvider):
    def dict(self):
        from faker import Faker

        fake = Faker()
        return {fake.word(): fake.sentence()}


factory.Faker.add_provider(Provider)


class AssessmentFactory(DjangoModelFactory):
    name = factory.Faker("sentence")
    description = factory.Faker("paragraph")
    status = "In progress"
    data = factory.Faker("dict")
    owner = factory.SubFactory(UserFactory)

    @factory.post_generation
    def shared_with(self, create, extracted, **kwargs):
        if extracted:
            for user in extracted:
                self.shared_with.add(user)

    class Meta:
        model = Assessment


class ImageFactory(DjangoModelFactory):
    image = factory.Faker("url")
    height = 300
    width = 400

    thumbnail = factory.Faker("url")
    thumbnail_height = 30
    thumbnail_width = 40

    note = factory.Faker("sentence")

    class Meta:
        model = Image


class ReportFactory(DjangoModelFactory):
    created_at = factory.Faker("date_time")
    file = factory.Faker("url")
    assessment = factory.SubFactory(AssessmentFactory)

    class Meta:
        model = Report


class OrganisationFactory(DjangoModelFactory):
    name = factory.Faker("company")

    @factory.post_generation
    def members(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for group in extracted:
                self.members.add(group)

    @factory.post_generation
    def librarians(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for group in extracted:
                self.librarians.add(group)

    @factory.post_generation
    def admins(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for group in extracted:
                self.admins.add(group)

    class Meta:
        model = Organisation


class ReportTemplateFactory(DjangoModelFactory):
    name = factory.Faker("name")

    class Meta:
        model = ReportTemplate


class LibraryFactory(DjangoModelFactory):
    name = "Standard Library - exampleuser"
    type = "generation_measures"
    data: dict[str, dict] = {}
    owner_user = factory.SubFactory(UserFactory)
    owner_organisation = None

    class Meta:
        model = Library


class OrganisationWithExtrasFactory(OrganisationFactory):
    "Creates an Organisation with 1 member and 1 assessment"

    @factory.post_generation
    def assessments(self, create: bool, extracted: Sequence[Any], **kwargs):
        from macquette.users.tests.factories import UserFactory

        self._assessment_owner = UserFactory.create()
        self.assessments.add(AssessmentFactory.create(owner=self._assessment_owner))

    @factory.post_generation
    def members(self, create: bool, extracted: Sequence[Any], **kwargs):
        self.members.add(self._assessment_owner)
