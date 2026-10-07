"""
PulseQC Audit Service.
Records immutable audit trail of human and system actions.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pulseqc.database import get_connection


def record_audit(
    entity_type: str,
    entity_id: int,
    action: str,
    old_value: Optional[str],
    new_value: Optional[str],
    performed_by: str = "Operator"
) -> int:
    """Insert an audit log entry."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat() + "Z"

    cursor.execute("""
        INSERT INTO audit_logs (
            entity_type, entity_id, action, old_value, new_value, performed_by, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        entity_type,
        entity_id,
        action,
        str(old_value) if old_value is not None else None,
        str(new_value) if new_value is not None else None,
        performed_by,
        now_iso
    ))
    conn.commit()
    audit_id = cursor.lastrowid
    conn.close()
    return audit_id


def get_audit_trail(entity_type: str, entity_id: int) -> List[Dict[str, Any]]:
    """Fetch audit history for a given entity."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM audit_logs
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY timestamp ASC
    """, (entity_type, entity_id))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
