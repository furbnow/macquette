# Generated by Django 4.1.1 on 2022-09-12 09:43
from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organisations", "0002_copy_v2_org_data"),
        ("v2", "0008_allow_blank_assessment"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="organisation",
            name="report_template",
        ),
    ]
