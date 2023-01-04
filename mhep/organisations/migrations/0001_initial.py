# Generated by Django 3.1.7 on 2021-03-30 08:14
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Organisation",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "admins",
                    models.ManyToManyField(
                        blank=True,
                        related_name="organisations_where_admin",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "librarians",
                    models.ManyToManyField(
                        blank=True,
                        related_name="organisations_where_librarian",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "members",
                    models.ManyToManyField(
                        blank=True,
                        related_name="organisations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
