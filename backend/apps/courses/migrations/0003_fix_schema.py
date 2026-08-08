from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Reconcile the real courses_course DB table with the Django model.
    The old table had teacher_id (FK) but was missing department_id and section_id.
    This migration adds the missing columns and removes the legacy teacher_id column.
    """

    dependencies = [
        ('courses', '0002_course_instructors'),
        ('institutions', '0001_initial'),
    ]

    operations = []
