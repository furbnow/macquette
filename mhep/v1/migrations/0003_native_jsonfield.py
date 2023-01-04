# Generated by Django 3.1.7 on 2021-03-16 14:35
from django.db import migrations, models

import mhep.v1.validators


class Migration(migrations.Migration):

    dependencies = [
        ("v1", "0002_make_related_name_app_dependent"),
    ]

    operations = [
        migrations.AlterField(
            model_name="assessment",
            name="data",
            field=models.JSONField(
                default=dict, validators=[mhep.v1.validators.validate_dict]
            ),
        ),
        migrations.AlterField(
            model_name="library",
            name="data",
            field=models.JSONField(
                default=dict, validators=[mhep.v1.validators.validate_dict]
            ),
        ),
    ]
