# Generated by Django 2.2.4 on 2019-12-16 01:33
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("dev", "0010_add_organisation_report")]

    operations = [
        migrations.RemoveField(model_name="assessment", name="openbem_version")
    ]
