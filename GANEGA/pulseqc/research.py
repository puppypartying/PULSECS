"""
PulseQC Research Evaluation Module.
Supports academic experiments, human ground-truth annotation,
accuracy/F1 calculation, confusion matrix, and processing time experiments.
"""

from typing import Dict, Any, List, Optional
from pulseqc.database import get_connection


def record_ground_truth_annotation(
    review_id: int,
    true_sentiment: str,
    true_category: str,
    true_severity: str,
    true_priority: str,
    annotator: str = "Researcher",
    manual_time_sec: Optional[float] = None,
    pulseqc_time_sec: Optional[float] = None,
    notes: Optional[str] = None
) -> int:
    """Store human researcher ground-truth label for evaluation."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO research_annotations (
            review_id, true_sentiment, true_category, true_severity, true_priority,
            annotator, manual_processing_time_sec, pulseqc_processing_time_sec, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        review_id, true_sentiment, true_category, true_severity, true_priority,
        annotator, manual_time_sec, pulseqc_time_sec, notes
    ))
    conn.commit()
    ann_id = cursor.lastrowid
    conn.close()
    return ann_id


def evaluate_ai_performance() -> Dict[str, Any]:
    """
    Computes classification accuracy, confusion matrix, and processing time
    metrics comparing AI predictions with human ground truth annotations.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT a.review_id, a.true_sentiment, a.true_category, a.true_severity, a.true_priority,
               a.manual_processing_time_sec, a.pulseqc_processing_time_sec,
               ra.sentiment AS pred_sentiment, ra.issue_category AS pred_category,
               ra.severity AS pred_severity, qc.priority AS pred_priority
        FROM research_annotations a
        JOIN review_analysis ra ON a.review_id = ra.review_id
        JOIN qc_cases qc ON a.review_id = qc.review_id
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total = len(rows)
    if total == 0:
        return {
            "annotated_count": 0,
            "sentiment_accuracy": None,
            "category_accuracy": None,
            "severity_accuracy": None,
            "priority_accuracy": None,
            "manual_mean_sec": None,
            "pulseqc_mean_sec": None,
            "time_reduction_percentage": None,
            "confusion_matrix_sentiment": {},
            "status": "EVIDENCE REQUIRED (No ground truth annotations entered yet)"
        }

    sentiment_matches = sum(1 for r in rows if r["true_sentiment"] == r["pred_sentiment"])
    category_matches = sum(1 for r in rows if r["true_category"] == r["pred_category"])
    severity_matches = sum(1 for r in rows if r["true_severity"] == r["pred_severity"])
    priority_matches = sum(1 for r in rows if r["true_priority"] == r["pred_priority"])

    # Processing time statistics
    manual_times = [r["manual_processing_time_sec"] for r in rows if r.get("manual_processing_time_sec")]
    pulseqc_times = [r["pulseqc_processing_time_sec"] for r in rows if r.get("pulseqc_processing_time_sec")]

    mean_manual = round(sum(manual_times) / len(manual_times), 1) if manual_times else None
    mean_pulseqc = round(sum(pulseqc_times) / len(pulseqc_times), 1) if pulseqc_times else None
    time_reduction_pct = None
    if mean_manual and mean_pulseqc and mean_manual > 0:
        time_reduction_pct = round(((mean_manual - mean_pulseqc) / mean_manual) * 100.0, 1)

    # Confusion matrix for sentiment
    classes = ["POSITIVE", "NEUTRAL", "NEGATIVE"]
    matrix = {c_true: {c_pred: 0 for c_pred in classes} for c_true in classes}
    for r in rows:
        t = r["true_sentiment"]
        p = r["pred_sentiment"]
        if t in matrix and p in matrix[t]:
            matrix[t][p] += 1

    return {
        "annotated_count": total,
        "sentiment_accuracy": round((sentiment_matches / total) * 100.0, 1),
        "category_accuracy": round((category_matches / total) * 100.0, 1),
        "severity_accuracy": round((severity_matches / total) * 100.0, 1),
        "priority_accuracy": round((priority_matches / total) * 100.0, 1),
        "manual_mean_sec": mean_manual,
        "pulseqc_mean_sec": mean_pulseqc,
        "time_reduction_percentage": time_reduction_pct,
        "confusion_matrix_sentiment": matrix,
        "status": "MEASURED"
    }
