# Generated by Django 3.1.7 on 2021-03-30 13:53
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organisations", "0001_initial"),
        ("dev", "0016_native_jsonfield"),
    ]

    operations = [
        migrations.AddField(
            model_name="organisation",
            name="organisation",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="dev_data",
                to="organisations.organisation",
            ),
        ),
    ]
