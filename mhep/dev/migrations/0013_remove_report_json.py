# Generated by Django 2.2.4 on 2020-02-10 13:26
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("dev", "0012_add_report_template"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="organisation",
            name="report",
        ),
    ]
