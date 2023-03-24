# SAFETY: This function exists but isn't public, which is why the type stubs
# don't have it.
from django.contrib.sites.models import _simple_domain_name_validator  # type: ignore[attr-defined]
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("sites", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="site",
            name="domain",
            field=models.CharField(
                max_length=100,
                unique=True,
                validators=[_simple_domain_name_validator],
                verbose_name="domain name",
            ),
        )
    ]
