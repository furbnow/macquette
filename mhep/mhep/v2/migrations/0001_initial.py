# Generated by Django 2.2.4 on 2020-01-06 21:04
import uuid

import django.contrib.postgres.fields.jsonb
import django.db.models.deletion
from django.conf import settings
from django.db import migrations
from django.db import models

import mhep.v2.models.image
import mhep.v2.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Assessment",
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
                ("description", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("Complete", "Complete"),
                            ("In progress", "In progress"),
                            ("Test", "Test"),
                        ],
                        default="In progress",
                        max_length=20,
                    ),
                ),
                (
                    "data",
                    django.contrib.postgres.fields.jsonb.JSONField(
                        default=dict, validators=[mhep.v2.validators.validate_dict]
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
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
                (
                    "report",
                    django.contrib.postgres.fields.jsonb.JSONField(
                        default=dict,
                        validators=[
                            mhep.v2.validators.validate_dict,
                            mhep.v2.validators.validate_report,
                        ],
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "admins",
                    models.ManyToManyField(
                        blank=True,
                        related_name="v2_organisations_where_admin",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "librarians",
                    models.ManyToManyField(
                        blank=True,
                        related_name="v2_organisations_where_librarian",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "members",
                    models.ManyToManyField(
                        blank=True,
                        related_name="v2_organisations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Library",
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
                ("type", models.TextField()),
                (
                    "data",
                    django.contrib.postgres.fields.jsonb.JSONField(
                        default=dict, validators=[mhep.v2.validators.validate_dict]
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner_organisation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="libraries",
                        to="v2.Organisation",
                    ),
                ),
                (
                    "owner_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="v2_libraries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "shared_with",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Sharing the library with another organisation gives members of that organisation read-only access: they can use the library but not update it.",
                        related_name="libraries_shared_with",
                        to="v2.Organisation",
                    ),
                ),
            ],
            options={"verbose_name_plural": "libraries",},
        ),
        migrations.CreateModel(
            name="Image",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "uuid",
                    models.UUIDField(db_index=True, default=uuid.uuid4, editable=False),
                ),
                (
                    "image",
                    models.ImageField(
                        max_length=200, upload_to=mhep.v2.models.image.Image._image_path
                    ),
                ),
                ("height", models.IntegerField()),
                ("width", models.IntegerField()),
                (
                    "thumbnail",
                    models.ImageField(
                        max_length=200,
                        upload_to=mhep.v2.models.image.Image._thumbnail_path,
                    ),
                ),
                ("thumbnail_height", models.IntegerField()),
                ("thumbnail_width", models.IntegerField()),
                ("note", models.TextField(blank=True, default="")),
                (
                    "assessment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="v2.Assessment",
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="assessment",
            name="featured_image",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="featured_on",
                to="v2.Image",
            ),
        ),
        migrations.AddField(
            model_name="assessment",
            name="organisation",
            field=models.ForeignKey(
                blank=True,
                default=None,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assessments",
                to="v2.Organisation",
            ),
        ),
        migrations.AddField(
            model_name="assessment",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="v2_assessments",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="library",
            constraint=models.CheckConstraint(
                check=models.Q(
                    models.Q(
                        ("owner_user__isnull", False),
                        ("owner_organisation__isnull", True),
                    ),
                    models.Q(
                        ("owner_user__isnull", True),
                        ("owner_organisation__isnull", False),
                    ),
                    models.Q(
                        ("owner_user__isnull", True),
                        ("owner_organisation__isnull", True),
                    ),
                    _connector="OR",
                ),
                name="owner_cant_be_both_user_and_organisation",
            ),
        ),
    ]