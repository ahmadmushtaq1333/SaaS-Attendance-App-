import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0004_alter_course_unique_together"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CourseLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("link_type", models.CharField(
                    choices=[("theory_lab", "Theory & Lab"), ("parallel", "Parallel Sections"), ("other", "Other")],
                    default="theory_lab",
                    max_length=20,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("source_course", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="links_as_source",
                    to="courses.course",
                )),
                ("target_course", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="links_as_target",
                    to="courses.course",
                )),
                ("created_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="course_links_created",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "verbose_name": "Course Link",
                "verbose_name_plural": "Course Links",
                "unique_together": {("source_course", "target_course")},
            },
        ),
    ]
