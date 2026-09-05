# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_emailverificationcode_failed_attempts'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='bound_device_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
