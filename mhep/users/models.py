from django.contrib.auth.models import AbstractUser
from django.db.models import CharField
from django.urls import reverse


class User(AbstractUser):

    # First Name and Last Name do not cover name patterns
    # around the globe.
    name = CharField("Name of User", blank=True, max_length=255)

    def get_absolute_url(self):
        return reverse("users:detail", kwargs={"username": self.username})

    def can_list_organisations(self) -> bool:
        """Only users that are admins of something can list organisations."""
        return self.is_staff or self.organisations_where_admin.exists()

    def can_list_users(self) -> bool:
        """Only users that are admins of something can list users."""
        return self.organisations_where_admin.exists()

    def __str__(self):
        return f'"{self.name}" <{self.email}> #{self.id}'

    class Meta:
        ordering = ["id"]
