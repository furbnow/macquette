# Generated by Django 3.1.7 on 2021-09-01 10:35
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("v1", "0004_fk_to_global_org"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="library",
            name="owner",
        ),
        migrations.RemoveField(
            model_name="organisation",
            name="members",
        ),
        migrations.RemoveField(
            model_name="organisation",
            name="organisation",
        ),
        migrations.DeleteModel(
            name="Assessment",
        ),
        migrations.DeleteModel(
            name="Library",
        ),
        migrations.DeleteModel(
            name="Organisation",
        ),
    ]
