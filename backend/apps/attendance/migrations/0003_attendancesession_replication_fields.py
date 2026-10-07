import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0002_fix_attendance_schema"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancesession",
            name="is_replicated",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="attendancesession",
            name="replicated_from",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="replications",
                to="attendance.attendancesession",
            ),
        ),
    ]
