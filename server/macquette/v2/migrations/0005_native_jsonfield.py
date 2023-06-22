# Generated by Django 3.1.7 on 2021-03-16 14:35
from django.db import migrations, models

import macquette.v2.validators


class Migration(migrations.Migration):
    dependencies = [
        ("v2", "0004_unique_names_for_constraints"),
    ]

    operations = [
        migrations.AlterField(
            model_name="assessment",
            name="data",
            field=models.JSONField(
                default=dict, validators=[macquette.v2.validators.validate_dict]
            ),
        ),
        migrations.AlterField(
            model_name="library",
            name="data",
            field=models.JSONField(
                default=dict, validators=[macquette.v2.validators.validate_dict]
            ),
        ),
    ]