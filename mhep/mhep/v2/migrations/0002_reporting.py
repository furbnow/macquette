# Generated by Django 2.2.4 on 2020-02-10 14:07
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("v2", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(model_name="organisation", name="report",),
        migrations.AddField(
            model_name="organisation",
            name="report_template",
            field=models.TextField(blank=True),
        ),
    ]
