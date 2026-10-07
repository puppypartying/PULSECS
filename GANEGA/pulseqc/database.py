"""
PulseQC Database Module.
Handles SQLite/PostgreSQL schema initialization, idempotency constraints,
and query execution using Python's standard library.
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from pulseqc.config import Config


def get_db_path() -> str:
    """Extract SQLite database file path from DATABASE_URL or config."""
    db_url = Config.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    return Config.DB_FILE_PATH


def get_connection() -> sqlite3.Connection:
    """Obtain a SQLite database connection with row factory."""
    db_path = get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """Initialize complete PulseQC schema with idempotency guarantees."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. reviews table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_name TEXT NOT NULL,
        app_name TEXT NOT NULL,
        google_review_id TEXT NOT NULL,
        author_name TEXT,
        review_text TEXT NOT NULL,
        original_text TEXT,
        star_rating INTEGER NOT NULL,
        reviewer_language TEXT DEFAULT 'id',
        review_created_at TEXT NOT NULL,
        review_last_modified_at TEXT NOT NULL,
        app_version_code INTEGER,
        app_version_name TEXT,
        android_os_version INTEGER,
        device TEXT,
        device_metadata_json TEXT,
        thumbs_up_count INTEGER DEFAULT 0,
        thumbs_down_count INTEGER DEFAULT 0,
        developer_reply_text TEXT,
        developer_reply_last_modified_at TEXT,
        raw_api_payload TEXT,
        data_source TEXT NOT NULL, -- 'REAL_GOOGLE_PLAY', 'HISTORICAL_GOOGLE_PLAY_EXPORT', 'SYNTHETIC_DEMO'
        first_ingested_at TEXT NOT NULL,
        last_synced_at TEXT NOT NULL,
        UNIQUE(package_name, google_review_id)
    );
    """)

    # 2. review_analysis table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS review_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL UNIQUE,
        sentiment TEXT NOT NULL, -- POSITIVE, NEUTRAL, NEGATIVE
        issue_category TEXT NOT NULL,
        severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
        urgency_score INTEGER NOT NULL, -- 0-100
        confidence_score INTEGER NOT NULL, -- 0-100
        complaint_summary TEXT NOT NULL,
        detected_issue TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        evidence_span TEXT NOT NULL,
        repeated_issue_flag INTEGER DEFAULT 0, -- 1=True, 0=False
        analysis_status TEXT NOT NULL, -- COMPLETED, PENDING_ANALYSIS, ANALYSIS_FAILED
        analysis_model TEXT NOT NULL,
        analysis_version TEXT NOT NULL,
        analyzed_at TEXT NOT NULL,
        FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );
    """)

    # 3. qc_cases table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS qc_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL UNIQUE,
        priority TEXT NOT NULL, -- P1, P2, P3, P4
        priority_score INTEGER NOT NULL, -- 0-100
        priority_reasons TEXT NOT NULL, -- JSON array of strings
        status TEXT NOT NULL DEFAULT 'NEW', -- NEW, UNDER_REVIEW, INVESTIGATING, RESOLVED, CLOSED
        assigned_to TEXT,
        operator_note TEXT,
        queue_created_at TEXT NOT NULL,
        first_action_at TEXT,
        resolved_at TEXT,
        closed_at TEXT,
        resolution_note TEXT,
        FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );
    """)

    # 4. issue_clusters table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issue_clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cluster_name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        issue_description TEXT NOT NULL,
        occurrence_count INTEGER DEFAULT 0,
        previous_period_count INTEGER DEFAULT 0,
        current_period_count INTEGER DEFAULT 0,
        growth_percentage REAL,
        trend_direction TEXT DEFAULT 'NEW_ISSUE', -- INCREASING, STABLE, DECREASING, NEW_ISSUE
        severity TEXT NOT NULL,
        first_detected_at TEXT NOT NULL,
        last_detected_at TEXT NOT NULL,
        cluster_confidence INTEGER DEFAULT 80
    );
    """)

    # 5. sync_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        api_requests_used INTEGER DEFAULT 0,
        reviews_found INTEGER DEFAULT 0,
        new_reviews INTEGER DEFAULT 0,
        updated_reviews INTEGER DEFAULT 0,
        analysis_success INTEGER DEFAULT 0,
        analysis_failed INTEGER DEFAULT 0,
        qc_cases_created INTEGER DEFAULT 0,
        status TEXT NOT NULL, -- SUCCESS, PARTIAL, FAILED, RUNNING
        error_message TEXT
    );
    """)

    # 6. system_settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_name TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 7. audit_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        performed_by TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );
    """)

    # 8. research_annotations table (UTS Ground Truth)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS research_annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL UNIQUE,
        true_sentiment TEXT,
        true_category TEXT,
        true_severity TEXT,
        true_priority TEXT,
        annotator TEXT NOT NULL,
        manual_processing_time_sec REAL,
        pulseqc_processing_time_sec REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );
    """)

    # 9. market_test_records table (UTS Experiment)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_test_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hypothesis TEXT NOT NULL,
        respondent_id TEXT NOT NULL,
        condition TEXT NOT NULL, -- CONTROL, TREATMENT
        task_name TEXT NOT NULL,
        time_to_identify_critical_sec REAL,
        time_to_prioritize_sec REAL,
        accuracy_score REAL,
        operator_workload_score INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_pkg_g_id ON reviews(package_name, google_review_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(star_rating);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(review_created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_qc_cases_status ON qc_cases(status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_qc_cases_priority ON qc_cases(priority);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_category ON review_analysis(issue_category);")

    # Seed default system settings if not exists
    cursor.execute("""
        INSERT OR IGNORE INTO system_settings (setting_name, setting_value, updated_at)
        VALUES ('app_name', 'Super App Polri', datetime('now')),
               ('package_name', 'superapps.polri.presisi.presisi', datetime('now')),
               ('polling_interval_seconds', '300', datetime('now')),
               ('sla_p1_minutes', '60', datetime('now')),
               ('sla_p2_minutes', '240', datetime('now')),
               ('sla_p3_minutes', '1440', datetime('now')),
               ('sla_p4_minutes', '4320', datetime('now')),
               ('last_worker_heartbeat', datetime('now'), datetime('now'));
    """)

    conn.commit()
    conn.close()
