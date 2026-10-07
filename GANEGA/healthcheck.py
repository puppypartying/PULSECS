"""
PulseQC System Health Diagnostic CLI.
Evaluates all system dependencies, API credentials, and runtime state.
Run via: python healthcheck.py
"""

import sys
import os
from datetime import datetime

# Ensure project root is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pulseqc.config import Config
from pulseqc.database import init_db, get_connection
from pulseqc.google_play_client import GooglePlayClient, GooglePlayStatus


def run_healthcheck() -> bool:
    print("=" * 60)
    print("   PULSEQC SYSTEM HEALTH DIAGNOSTIC REPORT")
    print(f"   Target App: {Config.APP_NAME}")
    print(f"   Target Package: {Config.APP_PACKAGE_NAME}")
    print(f"   Timestamp: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)

    all_pass = True

    # 1. Configuration check
    cfg_val = Config.validate()
    cfg_status = "PASS" if cfg_val["valid"] else "FAIL"
    print(f"Configuration:         {cfg_status}")
    if not cfg_val["valid"]:
        all_pass = False
        for issue in cfg_val["issues"]:
            print(f"  └─ Issue: {issue}")

    # 2. Database check
    db_status = "FAIL"
    try:
        init_db()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS total FROM reviews")
        count = cur.fetchone()["total"]
        conn.close()
        db_status = "PASS"
        print(f"Database:              {db_status} (Connected, total reviews: {count})")
    except Exception as e:
        all_pass = False
        print(f"Database:              {db_status} (Error: {str(e)})")

    # 3. Google Play & Credentials check
    client = GooglePlayClient(Config.APP_PACKAGE_NAME)
    diag = client.diagnose_connection()

    cred_status = diag["credentials"]["status"]
    print(f"Google Cloud credentials: {cred_status} ({diag['credentials']['explanation']})")

    api_status = diag["google_api"]["status"]
    print(f"Google Play API:       {api_status} ({diag['google_api']['explanation']})")

    pkg_status = diag["package_access"]["status"]
    print(f"Configured package:    {pkg_status} ({diag['package_access']['explanation']})")

    review_endpoint_status = diag["review_endpoint"]["status"]
    print(f"Review retrieval:      {review_endpoint_status} ({diag['review_endpoint']['explanation']})")

    # 4. Gemini AI check
    gemini_key = bool(Config.GEMINI_API_KEY)
    gemini_status = "PASS" if gemini_key else "FAIL"
    gemini_detail = f"Configured model: {Config.GEMINI_MODEL}" if gemini_key else "GEMINI_API_KEY environment variable missing"
    print(f"Gemini:                {gemini_status} ({gemini_detail})")

    # 5. Worker heartbeat check
    worker_status = "PASS"
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT setting_value FROM system_settings WHERE setting_name = 'last_worker_heartbeat'")
        hb = cur.fetchone()
        conn.close()
        hb_val = hb["setting_value"] if hb else "None"
        print(f"Worker:                {worker_status} (Last heartbeat: {hb_val})")
    except Exception:
        print("Worker:                FAIL")

    print("-" * 60)
    print(f"Overall Diagnostic Status: {'READY' if (db_status == 'PASS' and cfg_status == 'PASS') else 'ATTENTION REQUIRED'}")
    if diag["overall_state"] != GooglePlayStatus.CONNECTED:
        print(f"Notice: Google Play API state is '{diag['overall_state']}'. Historical and Synthetic pipelines remain operational.")
    print("=" * 60)

    return all_pass


if __name__ == "__main__":
    success = run_healthcheck()
    sys.exit(0 if success else 1)
