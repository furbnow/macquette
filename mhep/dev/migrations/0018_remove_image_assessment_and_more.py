# Generated by Django 4.0.5 on 2023-01-05 17:41

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("dev", "0017_fk_to_global_org"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="image",
            name="assessment",
        ),
        migrations.RemoveField(
            model_name="library",
            name="owner_organisation",
        ),
        migrations.RemoveField(
            model_name="library",
            name="owner_user",
        ),
        migrations.RemoveField(
            model_name="library",
            name="shared_with",
        ),
        migrations.RemoveField(
            model_name="organisation",
            name="admins",
        ),
        migrations.RemoveField(
            model_name="organisation",
            name="librarians",
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
            name="Image",
        ),
        migrations.DeleteModel(
            name="Library",
        ),
        migrations.DeleteModel(
            name="Organisation",
        ),
    ]