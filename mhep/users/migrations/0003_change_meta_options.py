# Generated by Django 3.2.9 on 2021-12-14 13:35
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_auto_20210317_1405"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="user",
            options={"ordering": ["id"]},
        ),
    ]
