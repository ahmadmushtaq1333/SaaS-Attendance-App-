from django.db import migrations


def clear_stale_device_bindings(apps, schema_editor):
    DeviceBinding = apps.get_model('accounts', 'DeviceBinding')
    DeviceBinding.objects.all().delete()


def reverse_clear(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_auto_populate_registration_numbers'),
    ]

    operations = [
        migrations.RunPython(clear_stale_device_bindings, reverse_code=reverse_clear),
    ]
