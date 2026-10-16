from django.db import migrations
from django.db.models import Q


def backfill_registration_numbers(apps, schema_editor):
    CustomUser = apps.get_model("accounts", "CustomUser")
    students = CustomUser.objects.filter(role="student").filter(
        Q(registration_number__isnull=True) | Q(registration_number="")
    )
    for student in students:
        email = student.email or ""
        if "@" in email:
            local_part = email.split("@")[0].strip().upper()
            if local_part:
                if not CustomUser.objects.filter(registration_number__iexact=local_part).exclude(pk=student.pk).exists():
                    student.registration_number = local_part
                    student.save(update_fields=["registration_number"])


def reverse_backfill(apps, schema_editor):
    # Non-destructive: existing registration numbers are preserved on rollback
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_customuser_full_name"),
    ]

    operations = [
        migrations.RunPython(backfill_registration_numbers, reverse_code=reverse_backfill),
    ]
