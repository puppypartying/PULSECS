"""
PulseQC Comprehensive Test Suite.
Tests configuration, duplicate prevention, priority engine, AI schema,
clustering, trend calculation, SLA calculation, CSV import, and privacy masking.
Run via: python3 -m unittest tests/test_pulseqc.py
"""

import unittest
import os
import json
import sqlite3
from datetime import datetime

from pulseqc.config import Config
from pulseqc.schemas import (
    DataSource, Sentiment, IssueCategory, Severity, Priority,
    ReviewAnalysisResult, QCStatus
)
from pulseqc.privacy import mask_author_name
from pulseqc.priority_engine import calculate_priority
from pulseqc.issue_clustering import compute_cluster_trend, match_review_to_cluster
from pulseqc.qc_service import calculate_sla_status
from pulseqc.csv_importer import import_google_play_csv
from pulseqc.database import init_db, get_connection
from pulseqc.ingestion_service import ingest_review, parse_google_play_review_resource


class TestPulseQC(unittest.TestCase):

    def setUp(self):
        self.orig_key = Config.GEMINI_API_KEY
        Config.GEMINI_API_KEY = ""  # Force fast offline rule analysis for unit tests
        Config.DATABASE_URL = "sqlite:///./test_pulseqc.db"
        Config.DB_FILE_PATH = "./test_pulseqc.db"
        init_db()

    def tearDown(self):
        Config.GEMINI_API_KEY = self.orig_key
        if os.path.exists("./test_pulseqc.db"):
            try:
                os.remove("./test_pulseqc.db")
            except OSError:
                pass

    def test_configuration_validation(self):
        """Test configuration defaults and validation."""
        val = Config.validate()
        self.assertTrue(val["valid"])
        self.assertEqual(val["app_name"], "Super App Polri")
        self.assertIn("superapps.polri.presisi", val["app_package_name"])

    def test_privacy_masking(self):
        """Test author name pseudonymization."""
        self.assertEqual(mask_author_name("John Doe", force_mask=True), "J*** D***")
        self.assertEqual(mask_author_name("Budi Santoso", force_mask=True), "B*** S***")
        self.assertEqual(mask_author_name("Al", force_mask=True), "A*")
        self.assertEqual(mask_author_name("A", force_mask=True), "A")
        self.assertEqual(mask_author_name("John Doe", force_mask=False), "John Doe")

    def test_priority_engine_rules(self):
        """Test deterministic priority scoring and explainability."""
        # 1-star Critical OTP issue should trigger P1
        res_p1 = calculate_priority(
            star_rating=1,
            severity=Severity.CRITICAL.value,
            urgency_score=95,
            issue_category=IssueCategory.OTP.value,
            repeated_issue_flag=True,
            cluster_volume=12
        )
        self.assertEqual(res_p1.priority, Priority.P1.value)
        self.assertGreaterEqual(res_p1.priority_score, 80)
        self.assertTrue(any("1-star" in r for r in res_p1.priority_reasons))
        self.assertTrue(any("Critical" in r for r in res_p1.priority_reasons))

        # 5-star positive review should be P4
        res_p4 = calculate_priority(
            star_rating=5,
            severity=Severity.LOW.value,
            urgency_score=10,
            issue_category=IssueCategory.OTHER.value,
            repeated_issue_flag=False,
            cluster_volume=0
        )
        self.assertEqual(res_p4.priority, Priority.P4.value)
        self.assertLess(res_p4.priority_score, 30)

    def test_cluster_trend_mathematical_integrity(self):
        """Ensure zero-division is avoided and trends are labeled NEW_ISSUE when baseline is 0."""
        # Baseline = 0 -> NEW_ISSUE, no division by zero
        trend_new = compute_cluster_trend(current_count=14, previous_count=0)
        self.assertIsNone(trend_new["growth_percentage"])
        self.assertEqual(trend_new["trend_direction"], "NEW_ISSUE")

        # Baseline = 10, current = 20 -> +100%
        trend_spike = compute_cluster_trend(current_count=20, previous_count=10)
        self.assertEqual(trend_spike["growth_percentage"], 100.0)
        self.assertEqual(trend_spike["trend_direction"], "INCREASING")

        # Baseline = 20, current = 10 -> -50%
        trend_declining = compute_cluster_trend(current_count=10, previous_count=20)
        self.assertEqual(trend_declining["growth_percentage"], -50.0)
        self.assertEqual(trend_declining["trend_direction"], "DECREASING")

    def test_sla_calculation(self):
        """Test SLA tracking and breach detection."""
        # P1 SLA target is 60 minutes
        # Queue item created 90 minutes ago -> SLA_BREACHED
        now_ts = datetime.utcnow()
        import datetime as dt
        old_time = (now_ts - dt.timedelta(minutes=90)).isoformat() + "Z"

        sla = calculate_sla_status("P1", old_time)
        self.assertEqual(sla["status"], "SLA_BREACHED")
        self.assertGreaterEqual(sla["elapsed_min"], 89)

        # Fresh case created 5 minutes ago -> WITHIN_SLA
        fresh_time = (now_ts - dt.timedelta(minutes=5)).isoformat() + "Z"
        sla_fresh = calculate_sla_status("P1", fresh_time)
        self.assertEqual(sla_fresh["status"], "WITHIN_SLA")

    def test_idempotent_ingestion_and_duplicate_prevention(self):
        """Test database uniqueness constraint and idempotency on duplicate reviews."""
        conn = get_connection()
        sample_review = {
            "package_name": "superapps.polri.presisi.presisi",
            "app_name": "Super App Polri",
            "google_review_id": "test-rev-unique-001",
            "author_name": "Test User",
            "review_text": "OTP verifikasi via SMS tidak pernah sampai di HP saya.",
            "original_text": "OTP verifikasi via SMS tidak pernah sampai di HP saya.",
            "star_rating": 1,
            "reviewer_language": "id",
            "review_created_at": datetime.utcnow().isoformat() + "Z",
            "review_last_modified_at": datetime.utcnow().isoformat() + "Z",
            "data_source": DataSource.SYNTHETIC_DEMO.value
        }

        # 1. First ingestion -> new review
        is_new1, is_upd1, r_id1 = ingest_review(sample_review, conn=conn)
        self.assertTrue(is_new1)
        self.assertFalse(is_upd1)

        # 2. Second ingestion of exact same reviewId -> update, no new row
        sample_review["thumbs_up_count"] = 5
        is_new2, is_upd2, r_id2 = ingest_review(sample_review, conn=conn)
        self.assertFalse(is_new2)
        self.assertTrue(is_upd2)
        self.assertEqual(r_id1, r_id2)

        # Verify only 1 review row exists in database
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS total FROM reviews WHERE google_review_id = 'test-rev-unique-001'")
        count = cur.fetchone()["total"]
        self.assertEqual(count, 1)

        # Verify QC Case created
        cur.execute("SELECT * FROM qc_cases WHERE review_id = ?", (r_id1,))
        case = cur.fetchone()
        self.assertIsNotNone(case)
        self.assertEqual(case["status"], QCStatus.NEW.value)

        conn.close()

    def test_csv_importer(self):
        """Test Google Play CSV export parser and validation summary."""
        csv_data = (
            "Review ID,Star Rating,Review Text,Reviewer Name,App Version Name\n"
            "gp-csv-01,1,Aplikasi force close terus saat buka menu SIM,Ahmad Yani,1.4.1\n"
            "gp-csv-02,5,Sangat membantu dan praktis,Siti Nurhaliza,1.4.1\n"
            ",2,Review missing id should be rejected,Tanpa ID,1.4.1\n"
        )
        summary = import_google_play_csv(csv_data)
        self.assertEqual(summary["rows_detected"], 3)
        self.assertEqual(summary["rows_imported"], 2)
        self.assertEqual(summary["invalid_rows"], 1)
        self.assertEqual(summary["data_source"], DataSource.HISTORICAL_GOOGLE_PLAY_EXPORT.value)


if __name__ == "__main__":
    unittest.main()
