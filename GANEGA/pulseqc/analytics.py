"""
PulseQC Operational Analytics & Bottleneck Monitoring.
Calculates queue aging, SLA adherence, operator workload distribution,
and automated operational diagnostics based strictly on stored records.
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pulseqc.database import get_connection
from pulseqc.schemas import QCStatus, Priority
from pulseqc.qc_service import calculate_sla_status


def get_bottleneck_metrics() -> Dict[str, Any]:
    """Computes comprehensive operational bottleneck KPIs and diagnostic warnings."""
    conn = get_connection()
    cursor = conn.cursor()

    # Open cases
    cursor.execute("""
        SELECT q.id, q.priority, q.status, q.assigned_to, q.queue_created_at,
               r.star_rating, a.issue_category, a.severity
        FROM qc_cases q
        JOIN reviews r ON q.review_id = r.id
        LEFT JOIN review_analysis a ON a.review_id = r.id
        WHERE q.status NOT IN ('RESOLVED', 'CLOSED')
    """)
    open_rows = [dict(r) for r in cursor.fetchall()]

    total_open = len(open_rows)
    p1_open = sum(1 for r in open_rows if r["priority"] == Priority.P1.value)
    p2_open = sum(1 for r in open_rows if r["priority"] == Priority.P2.value)

    # Queue aging
    ages_minutes: List[float] = []
    oldest_case_age_min = 0.0
    oldest_case_id = None
    sla_breaches_p1 = 0
    sla_breaches_p2 = 0

    now = datetime.now(timezone.utc)

    for r in open_rows:
        try:
            created = datetime.fromisoformat(r["queue_created_at"].replace("Z", "+00:00"))
            age_min = max(0.0, (now - created).total_seconds() / 60.0)
            ages_minutes.append(age_min)
            if age_min > oldest_case_age_min:
                oldest_case_age_min = age_min
                oldest_case_id = r["id"]

            sla = calculate_sla_status(r["priority"], r["queue_created_at"])
            if sla["status"] == "SLA_BREACHED":
                if r["priority"] == Priority.P1.value:
                    sla_breaches_p1 += 1
                elif r["priority"] == Priority.P2.value:
                    sla_breaches_p2 += 1
        except Exception:
            pass

    avg_queue_age_min = round(sum(ages_minutes) / len(ages_minutes), 1) if ages_minutes else 0.0
    
    # Median queue age
    if ages_minutes:
        sorted_ages = sorted(ages_minutes)
        mid = len(sorted_ages) // 2
        median_queue_age_min = round((sorted_ages[mid] + sorted_ages[~mid]) / 2.0, 1)
    else:
        median_queue_age_min = 0.0

    # Backlog by Category
    category_counts: Dict[str, int] = {}
    for r in open_rows:
        cat = r.get("issue_category") or "OTHER"
        category_counts[cat] = category_counts.get(cat, 0) + 1
    top_unresolved_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else "None"

    # Workload by Operator
    operator_counts: Dict[str, int] = {}
    for r in open_rows:
        op = r.get("assigned_to") or "Unassigned"
        operator_counts[op] = operator_counts.get(op, 0) + 1

    # Automated diagnostic warnings (grounded in actual evidence)
    alerts: List[Dict[str, str]] = []
    if sla_breaches_p1 > 0:
        alerts.append({
            "type": "CRITICAL",
            "message": f"{sla_breaches_p1} P1 case(s) currently exceed the 60-minute target SLA."
        })
    if category_counts and category_counts.get(top_unresolved_category, 0) >= 3:
        alerts.append({
            "type": "WARNING",
            "message": f"High complaint backlog concentrated in '{top_unresolved_category}' ({category_counts[top_unresolved_category]} open cases)."
        })
    unassigned_count = operator_counts.get("Unassigned", 0)
    if unassigned_count > 0:
        alerts.append({
            "type": "INFO",
            "message": f"{unassigned_count} open cases are awaiting operator assignment."
        })

    conn.close()

    return {
        "total_open_cases": total_open,
        "p1_open": p1_open,
        "p2_open": p2_open,
        "sla_breaches_p1": sla_breaches_p1,
        "sla_breaches_p2": sla_breaches_p2,
        "avg_queue_age_minutes": avg_queue_age_min,
        "median_queue_age_minutes": median_queue_age_min,
        "oldest_case_age_minutes": round(oldest_case_age_min, 1),
        "oldest_case_id": oldest_case_id,
        "top_unresolved_category": top_unresolved_category,
        "category_backlog": category_counts,
        "operator_workload": operator_counts,
        "alerts": alerts
    }
