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

    operations = [
        # 1. Add department_id if missing
        migrations.RunSQL(
            sql="""
                SET @col_exists = (
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'courses_course'
                      AND COLUMN_NAME = 'department_id'
                );
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE courses_course ADD COLUMN department_id bigint NOT NULL DEFAULT 1 AFTER institution_id',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 2. Add section_id if missing
        migrations.RunSQL(
            sql="""
                SET @col_exists = (
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'courses_course'
                      AND COLUMN_NAME = 'section_id'
                );
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE courses_course ADD COLUMN section_id bigint NULL AFTER department_id',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 3. Add FK for department_id if not already present
        migrations.RunSQL(
            sql="""
                SET @fk_dept = (
                    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'courses_course'
                      AND CONSTRAINT_NAME = 'courses_course_department_id_fk'
                );
                SET @sql = IF(@fk_dept = 0,
                    'ALTER TABLE courses_course ADD CONSTRAINT courses_course_department_id_fk FOREIGN KEY (department_id) REFERENCES institutions_department(id) ON DELETE CASCADE',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 4. Add FK for section_id if not already present
        migrations.RunSQL(
            sql="""
                SET @fk_sec = (
                    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'courses_course'
                      AND CONSTRAINT_NAME = 'courses_course_section_id_fk'
                );
                SET @sql = IF(@fk_sec = 0,
                    'ALTER TABLE courses_course ADD CONSTRAINT courses_course_section_id_fk FOREIGN KEY (section_id) REFERENCES institutions_section(id) ON DELETE SET NULL',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 5. Drop the FK constraint on teacher_id first, then drop the column
        migrations.RunSQL(
            sql="""
                SET @fk_name = (
                    SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'courses_course'
                      AND CONSTRAINT_NAME LIKE '%teacher_id%'
                    LIMIT 1
                );
                SET @sql = IF(@fk_name IS NOT NULL,
                    CONCAT('ALTER TABLE courses_course DROP FOREIGN KEY ', @fk_name),
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 6. Now drop the teacher_id column itself
        migrations.RunSQL(
            sql="""
                SET @col_exists = (
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'courses_course'
                      AND COLUMN_NAME = 'teacher_id'
                );
                SET @sql = IF(@col_exists > 0,
                    'ALTER TABLE courses_course DROP COLUMN teacher_id',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
