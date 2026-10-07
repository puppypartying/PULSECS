"""
PulseQC Background Synchronization Worker.
Handles near-real-time polling, Google Play Publisher API ingestion,
AI analysis pipeline, rule-based priority triage, and cluster updates.
Run continuously: python worker.py
Run single cycle: python worker.py --once
"""

import sys
import os
import time
import argparse
import logging
from datetime import datetime, timezone

# Ensure project root is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pulseqc.config import Config
from pulseqc.database import init_db, get_connection
from pulseqc.google_play_client import GooglePlayClient, GooglePlayStatus
from pulseqc.ingestion_service import parse_google_play_review_resource, ingest_review

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Worker] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("PulseQC-Worker")


def run_sync_cycle() -> dict:
    """Execute a single atomic synchronization cycle."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    logger.info(f"Starting sync cycle for app '{Config.APP_NAME}' ({Config.APP_PACKAGE_NAME})")

    # Record sync start in sync_logs
    cursor.execute("""
        INSERT INTO sync_logs (
            started_at, api_requests_used, reviews_found, new_reviews,
            updated_reviews, analysis_success, analysis_failed, qc_cases_created, status
        ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 'RUNNING')
    """, (now_iso,))
    conn.commit()
    sync_log_id = cursor.lastrowid

    # Update heartbeat
    cursor.execute("""
        INSERT OR REPLACE INTO system_settings (setting_name, setting_value, updated_at)
        VALUES ('last_worker_heartbeat', ?, ?),
               ('last_sync_started', ?, ?)
    """, (now_iso, now_iso, now_iso, now_iso))
    conn.commit()

    client = GooglePlayClient(Config.APP_PACKAGE_NAME)
    diag = client.diagnose_connection()
    overall_status = diag["overall_state"]

    summary = {
        "sync_log_id": sync_log_id,
        "status": "COMPLETED",
        "api_requests": 0,
        "reviews_found": 0,
        "new_reviews": 0,
        "updated_reviews": 0,
        "analysis_success": 0,
        "analysis_failed": 0,
        "error": None
    }

    if overall_status != GooglePlayStatus.CONNECTED:
        msg = f"Live Google Play API is {overall_status}. Diagnosis: {diag['credentials']['explanation']}"
        logger.warning(msg)
        summary["status"] = "SKIPPED_UNAUTHORIZED"
        summary["error"] = msg

        # Finalize log
        cursor.execute("""
            UPDATE sync_logs SET
                completed_at = ?,
                status = ?,
                error_message = ?
            WHERE id = ?
        """, (datetime.now(timezone.utc).isoformat(), "SKIPPED", msg, sync_log_id))
        conn.commit()
        conn.close()
        return summary

    # If connected, fetch up to MAX_API_REQUESTS_PER_CYCLE pages
    next_page_token = None
    cycle_requests = 0

    try:
        while cycle_requests < Config.MAX_API_REQUESTS_PER_CYCLE:
            cycle_requests += 1
            raw_reviews, next_page_token, err = client.fetch_reviews(max_results=50, token_page=next_page_token)
            if err:
                summary["error"] = err
                break

            summary["reviews_found"] += len(raw_reviews)
            for raw in raw_reviews:
                parsed = parse_google_play_review_resource(raw, Config.APP_PACKAGE_NAME, Config.APP_NAME)
                is_new, is_updated, r_id = ingest_review(parsed, conn=conn)
                if is_new:
                    summary["new_reviews"] += 1
                    summary["analysis_success"] += 1
                elif is_updated:
                    summary["updated_reviews"] += 1

            if not next_page_token:
                break

    except Exception as ex:
        logger.error(f"Error during ingestion cycle: {ex}", exc_info=True)
        summary["error"] = str(ex)
        summary["status"] = "ERROR"

    summary["api_requests"] = cycle_requests
    completed_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        UPDATE sync_logs SET
            completed_at = ?,
            api_requests_used = ?,
            reviews_found = ?,
            new_reviews = ?,
            updated_reviews = ?,
            analysis_success = ?,
            qc_cases_created = ?,
            status = ?,
            error_message = ?
        WHERE id = ?
    """, (
        completed_iso,
        summary["api_requests"],
        summary["reviews_found"],
        summary["new_reviews"],
        summary["updated_reviews"],
        summary["analysis_success"],
        summary["new_reviews"],
        summary["status"],
        summary["error"],
        sync_log_id
    ))
    cursor.execute("""
        INSERT OR REPLACE INTO system_settings (setting_name, setting_value, updated_at)
        VALUES ('last_successful_sync', ?, ?);
    """, (completed_iso, completed_iso))
    conn.commit()
    conn.close()

    logger.info(f"Sync cycle finished: {summary['new_reviews']} new, {summary['updated_reviews']} updated.")
    return summary


def main():
    parser = argparse.ArgumentParser(description="PulseQC Background Synchronization Worker")
    parser.add_argument("--once", action="store_true", help="Run a single synchronization pass and exit")
    args = parser.parse_args()

    init_db()

    if args.once:
        logger.info("Executing single pass sync (--once)...")
        run_sync_cycle()
        return

    logger.info(f"Starting continuous polling loop (interval: {Config.SYNC_POLLING_INTERVAL_SECONDS}s)...")
    while True:
        try:
            run_sync_cycle()
        except Exception as e:
            logger.error(f"Worker encountered unexpected exception: {e}")
        time.sleep(Config.SYNC_POLLING_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
