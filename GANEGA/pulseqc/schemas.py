"""
PulseQC Schemas and Enums.
Strict domain definitions, categorical validation, and type specifications.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


class DataSource(str, Enum):
    REAL_GOOGLE_PLAY = "REAL_GOOGLE_PLAY"
    HISTORICAL_GOOGLE_PLAY_EXPORT = "HISTORICAL_GOOGLE_PLAY_EXPORT"
    SYNTHETIC_DEMO = "SYNTHETIC_DEMO"


class Sentiment(str, Enum):
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"


class IssueCategory(str, Enum):
    LOGIN_AUTHENTICATION = "LOGIN_AUTHENTICATION"
    OTP = "OTP"
    REGISTRATION = "REGISTRATION"
    APPLICATION_CRASH = "APPLICATION_CRASH"
    PERFORMANCE = "PERFORMANCE"
    PAYMENT = "PAYMENT"
    ACCOUNT = "ACCOUNT"
    SECURITY = "SECURITY"
    INFORMATION_ACCURACY = "INFORMATION_ACCURACY"
    FEATURE_REQUEST = "FEATURE_REQUEST"
    USER_INTERFACE = "USER_INTERFACE"
    ACCESSIBILITY = "ACCESSIBILITY"
    SERVICE_AVAILABILITY = "SERVICE_AVAILABILITY"
    OTHER = "OTHER"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Priority(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class QCStatus(str, Enum):
    NEW = "NEW"
    UNDER_REVIEW = "UNDER_REVIEW"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class AnalysisStatus(str, Enum):
    COMPLETED = "COMPLETED"
    PENDING_ANALYSIS = "PENDING_ANALYSIS"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"


class TrendDirection(str, Enum):
    INCREASING = "INCREASING"
    STABLE = "STABLE"
    DECREASING = "DECREASING"
    NEW_ISSUE = "NEW_ISSUE"


@dataclass
class ReviewAnalysisResult:
    sentiment: str
    issue_category: str
    severity: str
    urgency_score: int  # 0-100
    confidence_score: int  # 0-100
    complaint_summary: str
    detected_issue: str
    recommended_action: str
    evidence_span: str
    repeated_issue_flag: bool = False
    analysis_status: str = "COMPLETED"
    analysis_model: str = "gemini-3.8-flash"
    analysis_version: str = "v1.2.0"

    def validate(self) -> bool:
        if self.sentiment not in [s.value for s in Sentiment]:
            return False
        if self.issue_category not in [c.value for c in IssueCategory]:
            return False
        if self.severity not in [s.value for s in Severity]:
            return False
        if not (0 <= self.urgency_score <= 100):
            return False
        if not (0 <= self.confidence_score <= 100):
            return False
        if not self.evidence_span:
            return False
        return True


@dataclass
class PriorityResult:
    priority: str
    priority_score: int
    priority_reasons: List[str]
