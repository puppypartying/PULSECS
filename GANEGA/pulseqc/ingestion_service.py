"""
PulseQC Ingestion Service.
Handles review normalization, idempotent database upsert,
atomic trigger of AI classification, and QC case generation.
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from pulseqc.database import get_connection
from pulseqc.config import Config
from pulseqc.schemas import DataSource, QCStatus
from pulseqc.ai_classifier import analyze_review_text
from pulseqc.priority_engine import calculate_priority
from pulseqc.issue_clustering import match_review_to_cluster


def parse_google_play_review_resource(raw: Dict[str, Any], package_name: str, app_name: str) -> Dict[str, Any]:
    """
    Parses official Google Play Review Resource.
    Distinguishes user comment from developer reply.
    """
    review_id = raw.get("reviewId", "")
    author_name = raw.get("authorName", "Pengguna Google Play")

    comments = raw.get("comments", [])
    user_comment = {}
    developer_comment = {}

    for c in comments:
        if "userComment" in c:
            user_comment = c["userComment"]
        elif "developerComment" in c:
            developer_comment = c["developerComment"]

    # Extract user comment fields
    review_text = user_comment.get("text", "").strip()
    original_text = user_comment.get("originalText", review_text)
    star_rating = int(user_comment.get("starRating", 3))
    reviewer_language = user_comment.get("reviewerLanguage", "id")

    # Timestamps (seconds from epoch)
    created_sec = int(user_comment.get("lastModified", {}).get("seconds", datetime.utcnow().timestamp()))
    created_dt = datetime.utcfromtimestamp(created_sec).isoformat() + "Z"
    
    app_version_code = user_comment.get("appVersionCode")
    app_version_name = user_comment.get("appVersionName", "Unknown")
    android_os_version = user_comment.get("androidOsVersion")
    device = user_comment.get("device", "Unknown Device")
    thumbs_up = int(user_comment.get("thumbsUpCount", 0))
    thumbs_down = int(user_comment.get("thumbsDownCount", 0))

    dev_reply_text = developer_comment.get("text")
    dev_reply_time = None
    if dev_reply_text and "lastModified" in developer_comment:
        sec = int(developer_comment["lastModified"].get("seconds", 0))
        if sec > 0:
            dev_reply_time = datetime.utcfromtimestamp(sec).isoformat() + "Z"

    return {
        "package_name": package_name,
        "app_name": app_name,
        "google_review_id": review_id,
        "author_name": author_name,
        "review_text": review_text,
        "original_text": original_text,
        "star_rating": star_rating,
        "reviewer_language": reviewer_language,
        "review_created_at": created_dt,
        "review_last_modified_at": created_dt,
        "app_version_code": app_version_code,
        "app_version_name": app_version_name,
        "android_os_version": android_os_version,
        "device": device,
        "device_metadata_json": json.dumps(user_comment.get("deviceMetadata", {})),
        "thumbs_up_count": thumbs_up,
        "thumbs_down_count": thumbs_down,
        "developer_reply_text": dev_reply_text,
        "developer_reply_last_modified_at": dev_reply_time,
        "raw_api_payload": json.dumps(raw),
        "data_source": DataSource.REAL_GOOGLE_PLAY.value
    }


def ingest_review(review_dict: Dict[str, Any], conn=None) -> Tuple[bool, bool, Optional[int]]:
    """
    Idempotent review ingestion into database.
    Returns (is_new, is_updated, review_id).
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True

    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat() + "Z"

    pkg = review_dict["package_name"]
    gid = review_dict["google_review_id"]

    cursor.execute(
        "SELECT id, review_last_modified_at FROM reviews WHERE package_name = ? AND google_review_id = ?",
        (pkg, gid)
    )
    existing = cursor.fetchone()

    if existing:
        review_id = existing["id"]
        # Update existing record
        cursor.execute("""
            UPDATE reviews SET
                review_last_modified_at = ?,
                star_rating = ?,
                thumbs_up_count = ?,
                thumbs_down_count = ?,
                developer_reply_text = ?,
                developer_reply_last_modified_at = ?,
                last_synced_at = ?
            WHERE id = ?
        """, (
            review_dict["review_last_modified_at"],
            review_dict["star_rating"],
            review_dict.get("thumbs_up_count", 0),
            review_dict.get("thumbs_down_count", 0),
            review_dict.get("developer_reply_text"),
            review_dict.get("developer_reply_last_modified_at"),
            now_iso,
            review_id
        ))
        conn.commit()
        if should_close:
            conn.close()
        return False, True, review_id

    # Insert new review
    cursor.execute("""
        INSERT INTO reviews (
            package_name, app_name, google_review_id, author_name,
            review_text, original_text, star_rating, reviewer_language,
            review_created_at, review_last_modified_at, app_version_code,
            app_version_name, android_os_version, device, device_metadata_json,
            thumbs_up_count, thumbs_down_count, developer_reply_text,
            developer_reply_last_modified_at, raw_api_payload, data_source,
            first_ingested_at, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pkg,
        review_dict["app_name"],
        gid,
        review_dict.get("author_name", "Anonymous"),
        review_dict["review_text"],
        review_dict.get("original_text", review_dict["review_text"]),
        review_dict["star_rating"],
        review_dict.get("reviewer_language", "id"),
        review_dict["review_created_at"],
        review_dict["review_last_modified_at"],
        review_dict.get("app_version_code"),
        review_dict.get("app_version_name", "Unknown"),
        review_dict.get("android_os_version"),
        review_dict.get("device", "Unknown"),
        review_dict.get("device_metadata_json", "{}"),
        review_dict.get("thumbs_up_count", 0),
        review_dict.get("thumbs_down_count", 0),
        review_dict.get("developer_reply_text"),
        review_dict.get("developer_reply_last_modified_at"),
        review_dict.get("raw_api_payload", "{}"),
        review_dict.get("data_source", DataSource.REAL_GOOGLE_PLAY.value),
        now_iso,
        now_iso
    ))
    review_id = cursor.lastrowid

    # Perform AI analysis
    analysis = analyze_review_text(
        review_dict["review_text"],
        review_dict["star_rating"],
        review_dict["app_name"]
    )

    cursor.execute("""
        INSERT INTO review_analysis (
            review_id, sentiment, issue_category, severity, urgency_score,
            confidence_score, complaint_summary, detected_issue, recommended_action,
            evidence_span, repeated_issue_flag, analysis_status, analysis_model,
            analysis_version, analyzed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        review_id,
        analysis.sentiment,
        analysis.issue_category,
        analysis.severity,
        analysis.urgency_score,
        analysis.confidence_score,
        analysis.complaint_summary,
        analysis.detected_issue,
        analysis.recommended_action,
        analysis.evidence_span,
        1 if analysis.repeated_issue_flag else 0,
        analysis.analysis_status,
        analysis.analysis_model,
        analysis.analysis_version,
        now_iso
    ))

    # Calculate Priority
    priority_res = calculate_priority(
        star_rating=review_dict["star_rating"],
        severity=analysis.severity,
        urgency_score=analysis.urgency_score,
        issue_category=analysis.issue_category,
        repeated_issue_flag=analysis.repeated_issue_flag
    )

    # Create QC Case
    cursor.execute("""
        INSERT INTO qc_cases (
            review_id, priority, priority_score, priority_reasons,
            status, queue_created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (
        review_id,
        priority_res.priority,
        priority_res.priority_score,
        json.dumps(priority_res.priority_reasons),
        QCStatus.NEW.value,
        now_iso
    ))

    conn.commit()
    if should_close:
        conn.close()

    return True, False, review_id
