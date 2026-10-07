"""
PulseQC Historical CSV Import Module.
Imports official Google Play Console review exports (.csv)
with column mapping, normalization, duplicate handling, and summary metrics.
"""

import csv
import io
from datetime import datetime
from typing import Dict, Any, List, Optional
from pulseqc.schemas import DataSource
from pulseqc.ingestion_service import ingest_review
from pulseqc.config import Config
from pulseqc.database import get_connection


def import_google_play_csv(csv_content: str, app_name: str = Config.APP_NAME, package_name: str = Config.APP_PACKAGE_NAME) -> Dict[str, Any]:
    """
    Parses and imports Google Play Console reviews CSV export.
    Labels all imported records with data_source = HISTORICAL_GOOGLE_PLAY_EXPORT.
    """
    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f)

    summary = {
        "rows_detected": 0,
        "rows_imported": 0,
        "rows_skipped": 0,
        "duplicates": 0,
        "invalid_rows": 0,
        "invalid_details": [],
        "min_date": None,
        "max_date": None,
        "average_rating": 0.0,
        "ratings_sum": 0,
        "data_source": DataSource.HISTORICAL_GOOGLE_PLAY_EXPORT.value
    }

    conn = get_connection()

    for idx, row in enumerate(reader, start=1):
        summary["rows_detected"] += 1

        # Play console CSV headers commonly include:
        # "Review ID" or "ReviewId"
        # "Star Rating"
        # "Review Text"
        # "Review Submit Date and Time"
        # "App Version Name"
        # "Device"
        gid = row.get("Review ID") or row.get("ReviewId") or row.get("google_review_id") or row.get("id")
        text = row.get("Review Text") or row.get("review_text") or row.get("text") or ""
        rating_str = row.get("Star Rating") or row.get("star_rating") or row.get("rating") or "3"

        if not gid or not text.strip():
            summary["invalid_rows"] += 1
            summary["invalid_details"].append(f"Row {idx}: missing review ID or empty text")
            continue

        try:
            rating = int(rating_str.strip().split()[0])
            if not (1 <= rating <= 5):
                rating = 3
        except (ValueError, IndexError):
            rating = 3

        created_str = (
            row.get("Review Submit Date and Time") or
            row.get("Review Last Update Date and Time") or
            row.get("review_created_at") or
            datetime.utcnow().isoformat() + "Z"
        )

        author = row.get("Reviewer Name") or row.get("author_name") or "Pengguna Google Play"
        ver_name = row.get("App Version Name") or row.get("app_version_name") or "1.4.2"
        device = row.get("Device") or row.get("device") or "Android Device"

        review_dict = {
            "package_name": package_name,
            "app_name": app_name,
            "google_review_id": gid.strip(),
            "author_name": author.strip(),
            "review_text": text.strip(),
            "original_text": text.strip(),
            "star_rating": rating,
            "reviewer_language": row.get("Reviewer Language", "id"),
            "review_created_at": created_str,
            "review_last_modified_at": created_str,
            "app_version_code": int(row.get("App Version Code", 100)) if row.get("App Version Code") else None,
            "app_version_name": ver_name,
            "android_os_version": int(row.get("Android OS Version", 33)) if row.get("Android OS Version") else None,
            "device": device,
            "device_metadata_json": "{}",
            "thumbs_up_count": int(row.get("Thumbs Up Count", 0)) if row.get("Thumbs Up Count") else 0,
            "thumbs_down_count": 0,
            "developer_reply_text": row.get("Developer Reply Text"),
            "developer_reply_last_modified_at": row.get("Developer Reply Date and Time"),
            "raw_api_payload": "{}",
            "data_source": DataSource.HISTORICAL_GOOGLE_PLAY_EXPORT.value
        }

        is_new, is_updated, _ = ingest_review(review_dict, conn=conn)

        if is_new:
            summary["rows_imported"] += 1
            summary["ratings_sum"] += rating
        elif is_updated:
            summary["duplicates"] += 1
            summary["rows_skipped"] += 1

    if summary["rows_imported"] > 0:
        summary["average_rating"] = round(summary["ratings_sum"] / summary["rows_imported"], 2)

    conn.close()
    return summary
