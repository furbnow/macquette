# Generated by Django 4.0.3 on 2022-03-11 12:19
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import macquette.v2.validators


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organisations", "0002_copy_v2_org_data"),
        ("v2", "0006_fk_to_global_org"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReportTemplate",
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
                ("name", models.TextField()),
                ("template", models.TextField()),
            ],
        ),
        migrations.AddField(
            model_name="organisation",
            name="report_vars",
            field=models.JSONField(
                default=dict, validators=[macquette.v2.validators.validate_dict]
            ),
        ),
        migrations.AddField(
            model_name="organisation",
            name="report",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_organisations",
                to="v2.reporttemplate",
            ),
        ),
    ]
