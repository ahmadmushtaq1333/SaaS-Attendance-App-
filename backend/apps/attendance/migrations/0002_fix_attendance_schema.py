from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Update attendance_attendancerecord table to reference enrollment_id (ForeignKey)
    instead of student_id (User ForeignKey).
    """

    dependencies = [
        ('attendance', '0001_initial'),
        ('courses', '0001_initial'),
    ]

    operations = []
