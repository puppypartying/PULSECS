"""
PulseQC Quality Control Case Service.
Manages operator triage workflows, human overrides, SLA calculations, and audit logging.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pulseqc.database import get_connection
from pulseqc.schemas import QCStatus, Priority
from pulseqc.audit_service import record_audit
from pulseqc.config import Config


def update_qc_case_status(
    case_id: int,
    new_status: str,
    performed_by: str = "Operator",
    resolution_note: Optional[str] = None
) -> Dict[str, Any]:
    """Updates QC case status with audit trail."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat() + "Z"

    cursor.execute("SELECT * FROM qc_cases WHERE id = ?", (case_id,))
    case = cursor.fetchone()
    if not case:
        conn.close()
        raise ValueError(f"QC Case {case_id} not found")

    old_status = case["status"]
    first_action = case["first_action_at"]
    resolved_at = case["resolved_at"]
    closed_at = case["closed_at"]

    if not first_action and new_status != QCStatus.NEW.value:
        first_action = now_iso

    if new_status == QCStatus.RESOLVED.value and not resolved_at:
        resolved_at = now_iso
    elif new_status == QCStatus.CLOSED.value and not closed_at:
        closed_at = now_iso

    cursor.execute("""
        UPDATE qc_cases SET
            status = ?,
            first_action_at = ?,
            resolved_at = ?,
            closed_at = ?,
            resolution_note = COALESCE(?, resolution_note)
        WHERE id = ?
    """, (new_status, first_action, resolved_at, closed_at, resolution_note, case_id))
    conn.commit()
    conn.close()

    record_audit("qc_case", case_id, "STATUS_CHANGE", old_status, new_status, performed_by)
    if resolution_note:
        record_audit("qc_case", case_id, "RESOLUTION_NOTE_ADDED", None, resolution_note, performed_by)

    return {"case_id": case_id, "old_status": old_status, "new_status": new_status, "updated_at": now_iso}


def assign_qc_case(case_id: int, assigned_to: str, performed_by: str = "Supervisor") -> Dict[str, Any]:
    """Assigns operator to a QC case."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT assigned_to FROM qc_cases WHERE id = ?", (case_id,))
    case = cursor.fetchone()
    if not case:
        conn.close()
        raise ValueError(f"QC Case {case_id} not found")

    old_assignee = case["assigned_to"]
    cursor.execute("UPDATE qc_cases SET assigned_to = ? WHERE id = ?", (assigned_to, case_id))
    conn.commit()
    conn.close()

    record_audit("qc_case", case_id, "ASSIGNED", old_assignee, assigned_to, performed_by)
    return {"case_id": case_id, "assigned_to": assigned_to}


def calculate_sla_status(priority: str, queue_created_at: str, resolved_at: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes SLA performance:
    Targets:
    P1: 60 min
    P2: 240 min
    P3: 1440 min
    P4: 4320 min
    Returns { sla_target_min, elapsed_min, status: 'WITHIN_SLA' | 'APPROACHING_SLA' | 'SLA_BREACHED' }
    """
    target_map = {
        Priority.P1.value: Config.SLA_MINUTES_P1,
        Priority.P2.value: Config.SLA_MINUTES_P2,
        Priority.P3.value: Config.SLA_MINUTES_P3,
        Priority.P4.value: Config.SLA_MINUTES_P4,
    }
    target_min = target_map.get(priority, 1440)

    try:
        created_dt = datetime.fromisoformat(queue_created_at.replace("Z", "+00:00"))
        if resolved_at:
            end_dt = datetime.fromisoformat(resolved_at.replace("Z", "+00:00"))
        else:
            end_dt = datetime.now(timezone.utc)
        elapsed_min = int((end_dt - created_dt).total_seconds() / 60.0)
    except Exception:
        elapsed_min = 0

    if elapsed_min > target_min:
        status = "SLA_BREACHED"
    elif elapsed_min >= (target_min * 0.75):
        status = "APPROACHING_SLA"
    else:
        status = "WITHIN_SLA"

    return {
        "priority": priority,
        "sla_target_min": target_min,
        "elapsed_min": elapsed_min,
        "status": status
    }
