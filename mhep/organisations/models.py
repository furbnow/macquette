from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Organisation(models.Model):
    name = models.TextField()
    members = models.ManyToManyField(User, blank=True, related_name="organisations")
    librarians = models.ManyToManyField(
        User, blank=True, related_name="organisations_where_librarian"
    )
    admins = models.ManyToManyField(
        User, blank=True, related_name="organisations_where_admin"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
