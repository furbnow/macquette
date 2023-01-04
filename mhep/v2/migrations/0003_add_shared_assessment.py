# Generated by Django 2.2.4 on 2021-01-14 16:27
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("v2", "0002_reporting"),
    ]

    operations = [
        migrations.AddField(
            model_name="assessment",
            name="shared_with",
            field=models.ManyToManyField(
                blank=True,
                related_name="v2_shared_assessments",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
