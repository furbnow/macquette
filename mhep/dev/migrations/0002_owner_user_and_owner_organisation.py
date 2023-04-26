# Generated by Django 2.2.4 on 2019-11-14 10:19
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("dev", "0001_initial")]

    operations = [
        migrations.RenameField(
            model_name="library", old_name="owner", new_name="owner_user"
        ),
        migrations.AddField(
            model_name="library",
            name="owner_organisation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="dev_libraries",
                to="dev.Organisation",
            ),
        ),
        migrations.AlterField(
            model_name="library",
            name="owner_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="dev_libraries",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
