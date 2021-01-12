# Generated by Django 2.2.4 on 2021-01-12 12:15
from django.conf import settings
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("dev", "0013_remove_report_json"),
    ]

    operations = [
        migrations.AddField(
            model_name="assessment",
            name="shared_with",
            field=models.ManyToManyField(
                blank=True,
                related_name="dev_shared_assessments",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
