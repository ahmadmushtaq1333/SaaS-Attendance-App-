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

    operations = [
        # 1. Drop foreign key constraint on student_id
        migrations.RunSQL(
            sql="""
                SET @fk_name = (
                    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'attendance_attendancerecord'
                      AND COLUMN_NAME = 'student_id'
                      AND REFERENCED_TABLE_NAME = 'accounts_customuser'
                    LIMIT 1
                );
                SET @sql = IF(@fk_name IS NOT NULL,
                    CONCAT('ALTER TABLE attendance_attendancerecord DROP FOREIGN KEY ', @fk_name),
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 2. Drop unique key constraint on (student_id, session_id)
        migrations.RunSQL(
            sql="""
                SET @uniq_name = (
                    SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'attendance_attendancerecord'
                      AND CONSTRAINT_NAME LIKE '%student_id%'
                      AND CONSTRAINT_TYPE = 'UNIQUE'
                    LIMIT 1
                );
                SET @sql = IF(@uniq_name IS NOT NULL,
                    CONCAT('ALTER TABLE attendance_attendancerecord DROP KEY ', @uniq_name),
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 3. Truncate/delete the table records first to avoid data inconsistency/constraint failures
        migrations.RunSQL(
            sql="DELETE FROM attendance_attendancerecord;",
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 4. Drop the student_id column
        migrations.RunSQL(
            sql="""
                SET @col_exists = (
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'attendance_attendancerecord'
                      AND COLUMN_NAME = 'student_id'
                );
                SET @sql = IF(@col_exists > 0,
                    'ALTER TABLE attendance_attendancerecord DROP COLUMN student_id',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 5. Add enrollment_id column if not exists
        migrations.RunSQL(
            sql="""
                SET @col_exists = (
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'attendance_attendancerecord'
                      AND COLUMN_NAME = 'enrollment_id'
                );
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE attendance_attendancerecord ADD COLUMN enrollment_id bigint NOT NULL',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 6. Add foreign key for enrollment_id
        migrations.RunSQL(
            sql="""
                SET @fk_exists = (
                    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'attendance_attendancerecord'
                      AND CONSTRAINT_NAME = 'attendance_attendancerecord_enrollment_id_fk'
                );
                SET @sql = IF(@fk_exists = 0,
                    'ALTER TABLE attendance_attendancerecord ADD CONSTRAINT attendance_attendancerecord_enrollment_id_fk FOREIGN KEY (enrollment_id) REFERENCES courses_enrollment(id) ON DELETE CASCADE',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 7. Add unique key for (enrollment_id, session_id)
        migrations.RunSQL(
            sql="""
                SET @uniq_exists = (
                    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'attendance_attendancerecord'
                      AND CONSTRAINT_NAME = 'attendance_attendancerecord_enrollment_id_session_id_uniq'
                );
                SET @sql = IF(@uniq_exists = 0,
                    'ALTER TABLE attendance_attendancerecord ADD CONSTRAINT attendance_attendancerecord_enrollment_id_session_id_uniq UNIQUE (enrollment_id, session_id)',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
