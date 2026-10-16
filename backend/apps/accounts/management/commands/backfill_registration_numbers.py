from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from apps.accounts.models import CustomUser
from apps.accounts.registration_number import derive_registration_number


class Command(BaseCommand):
    help = "Backfill registration numbers for existing students from their email addresses."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without writing to the database",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing registration numbers even if already set",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        overwrite = options["overwrite"]

        qs = CustomUser.objects.filter(role="student")
        if not overwrite:
            qs = qs.filter(Q(registration_number__isnull=True) | Q(registration_number=""))

        students = list(qs)
        self.stdout.write(f"Found {len(students)} student(s) to process.")

        updated_count = 0
        skipped_count = 0

        with transaction.atomic():
            for student in students:
                derived = derive_registration_number(student.email)
                if not derived:
                    self.stdout.write(
                        self.style.WARNING(f"  [SKIP] {student.email} - could not derive registration number")
                    )
                    skipped_count += 1
                    continue

                # Check if another user already has this registration number
                conflict = (
                    CustomUser.objects.filter(registration_number__iexact=derived)
                    .exclude(pk=student.pk)
                    .first()
                )
                if conflict:
                    self.stdout.write(
                        self.style.ERROR(
                            f"  [CONFLICT] {student.email} -> {derived} conflicts with existing user {conflict.email}"
                        )
                    )
                    skipped_count += 1
                    continue

                if not dry_run:
                    student.registration_number = derived
                    student.save(update_fields=["registration_number"])

                self.stdout.write(
                    self.style.SUCCESS(f"  [OK] {student.email} -> registration_number='{derived}'")
                )
                updated_count += 1

            if dry_run:
                self.stdout.write(self.style.NOTICE(f"\nDRY RUN complete: {updated_count} would be updated, {skipped_count} skipped."))
                # Rollback transaction in dry run
                transaction.set_rollback(True)
            else:
                self.stdout.write(self.style.SUCCESS(f"\nSuccessfully backfilled {updated_count} student(s) ({skipped_count} skipped)."))
