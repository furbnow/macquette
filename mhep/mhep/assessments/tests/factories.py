from factory import DjangoModelFactory
from mhep.assessments.models import Assessment, Library


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
