import factory
from factory.django import DjangoModelFactory

from mhep.organisations.models import Organisation


class OrganisationFactory(DjangoModelFactory):
    name = factory.Faker("company")

    class Meta:
        model = Organisation
