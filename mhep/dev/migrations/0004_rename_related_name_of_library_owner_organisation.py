# Generated by Django 2.2.4 on 2019-11-25 11:29
import django.db.models.deletion
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [("dev", "0003_owner_cant_be_both_user_and_organisation")]

    operations = [
        migrations.AlterField(
            model_name="library",
            name="owner_organisation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="libraries",
                to="dev.Organisation",
            ),
        )
    ]