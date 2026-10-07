"""
PulseQC Deterministic Priority Engine.
Calculates priority scores (0-100) and tiers (P1-P4) using a multi-factor,
explainable rule-based algorithm. The LLM does NOT set priority directly.
"""

from typing import List, Dict, Any
from pulseqc.schemas import Priority, PriorityResult, Severity, IssueCategory
from pulseqc.config import Config


def calculate_priority(
    star_rating: int,
    severity: str,
    urgency_score: int,
    issue_category: str,
    repeated_issue_flag: bool = False,
    cluster_volume: int = 0
) -> PriorityResult:
    """
    Deterministic rule-based prioritization:
    Weight components:
    1. Severity Weight (max 35 pts)
    2. Rating Weight (max 25 pts)
    3. Urgency Score Weight (max 20 pts)
    4. Category Risk Weight (max 10 pts)
    5. Cluster Frequency / Recurrence Weight (max 10 pts)
    """
    reasons: List[str] = []
    score: float = 0.0

    # 1. Severity factor
    if severity == Severity.CRITICAL.value:
        score += 35.0
        reasons.append("Critical severity assessment")
    elif severity == Severity.HIGH.value:
        score += 25.0
        reasons.append("High severity assessment")
    elif severity == Severity.MEDIUM.value:
        score += 15.0
        reasons.append("Medium severity assessment")
    else:
        score += 5.0
        reasons.append("Low severity assessment")

    # 2. Rating factor
    if star_rating == 1:
        score += 25.0
        reasons.append("1-star critical rating")
    elif star_rating == 2:
        score += 18.0
        reasons.append("2-star negative rating")
    elif star_rating == 3:
        score += 10.0
        reasons.append("3-star neutral rating")
    elif star_rating == 4:
        score += 4.0
    else:
        score += 0.0

    # 3. Urgency factor (scale 0-100 to 0-20)
    urgency_norm = min(max(urgency_score, 0), 100) * 0.20
    score += urgency_norm
    if urgency_score >= 80:
        reasons.append(f"High urgency score ({urgency_score}/100)")
    elif urgency_score >= 50:
        reasons.append(f"Moderate urgency score ({urgency_score}/100)")

    # 4. Category Risk factor
    high_impact_categories = [
        IssueCategory.LOGIN_AUTHENTICATION.value,
        IssueCategory.OTP.value,
        IssueCategory.REGISTRATION.value,
        IssueCategory.APPLICATION_CRASH.value,
        IssueCategory.SECURITY.value,
        IssueCategory.PAYMENT.value,
    ]
    if issue_category in high_impact_categories:
        score += 10.0
        reasons.append(f"High-impact service category ({issue_category})")
    elif issue_category in [IssueCategory.PERFORMANCE.value, IssueCategory.SERVICE_AVAILABILITY.value]:
        score += 6.0
        reasons.append(f"Service availability/performance impact ({issue_category})")
    else:
        score += 2.0

    # 5. Cluster / Recurrence factor
    if repeated_issue_flag:
        score += 5.0
        reasons.append("Identified as recurring operational issue")
    if cluster_volume >= 10:
        score += 5.0
        reasons.append(f"High recurring cluster volume ({cluster_volume} occurrences)")
    elif cluster_volume >= 3:
        score += 3.0
        reasons.append(f"Active recurring cluster ({cluster_volume} occurrences)")

    # Cap score between 0 and 100
    final_score = int(min(max(round(score), 0), 100))

    # Determine Priority Tier based on configurable thresholds
    if final_score >= Config.PRIORITY_P1_MIN:
        priority_tier = Priority.P1.value
    elif final_score >= Config.PRIORITY_P2_MIN:
        priority_tier = Priority.P2.value
    elif final_score >= Config.PRIORITY_P3_MIN:
        priority_tier = Priority.P3.value
    else:
        priority_tier = Priority.P4.value

    return PriorityResult(
        priority=priority_tier,
        priority_score=final_score,
        priority_reasons=reasons
    )
