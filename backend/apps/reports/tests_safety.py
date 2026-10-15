from django.test import TestCase
from shared.attendance_utils import calculate_attendance_safety, calculate_attendance_percentage

class AttendanceSafetyUtilsTest(TestCase):
    def test_zero_sessions(self):
        res = calculate_attendance_safety(0, 0, target_pct=75.0)
        self.assertEqual(res["status"], "unstarted")
        self.assertEqual(res["safe_to_miss"], 0)
        self.assertEqual(res["needed_to_recover"], 0)

    def test_safe_zone_high_attendance(self):
        # 10 held, 9 attended = 90%. Target 75%.
        # 9 / 0.75 = 12. 12 - 10 = 2 classes can be missed.
        res = calculate_attendance_safety(9, 10, target_pct=75.0)
        self.assertEqual(res["status"], "safe")
        self.assertEqual(res["safe_to_miss"], 2)
        self.assertEqual(res["needed_to_recover"], 0)

    def test_on_the_edge_attendance(self):
        # 12 held, 9 attended = 75%. Target 75%.
        # Cannot miss any class without dropping below 75%.
        res = calculate_attendance_safety(9, 12, target_pct=75.0)
        self.assertEqual(res["status"], "warning")
        self.assertEqual(res["safe_to_miss"], 0)
        self.assertEqual(res["needed_to_recover"], 0)

    def test_danger_zone_needs_recovery(self):
        # 10 held, 6 attended = 60%. Target 75%.
        # (0.75 * 10 - 6) / 0.25 = 1.5 / 0.25 = 6 classes must be attended in a row.
        res = calculate_attendance_safety(6, 10, target_pct=75.0)
        self.assertIn(res["status"], ["warning", "critical"])
        self.assertEqual(res["safe_to_miss"], 0)
        self.assertEqual(res["needed_to_recover"], 6)

    def test_custom_target_pct(self):
        # Target 80%. 10 held, 10 attended (100%).
        # 10 / 0.8 = 12.5 -> floor is 12. 12 - 10 = 2 can be missed.
        res = calculate_attendance_safety(10, 10, target_pct=80.0)
        self.assertEqual(res["safe_to_miss"], 2)
