"""
PulseQC Issue Clustering & Trend Detection.
Groups semantically related complaints into operational clusters
and calculates period-over-period growth with mathematical rigor.
"""

from typing import List, Dict, Any, Optional
from pulseqc.schemas import TrendDirection, Severity


def compute_cluster_trend(current_count: int, previous_count: int) -> Dict[str, Any]:
    """
    Compute cluster trend safely.
    Zero-division safe: If previous count == 0, growth percentage is None,
    and trend direction is strictly NEW_ISSUE.
    """
    if previous_count == 0:
        return {
            "current_count": current_count,
            "previous_count": 0,
            "growth_percentage": None,
            "trend_direction": TrendDirection.NEW_ISSUE.value,
            "trend_label": "NEW ISSUE"
        }

    diff = current_count - previous_count
    growth_pct = round((diff / previous_count) * 100.0, 1)

    if growth_pct > 15.0:
        direction = TrendDirection.INCREASING.value
        label = f"+{growth_pct}% (Spike)"
    elif growth_pct < -15.0:
        direction = TrendDirection.DECREASING.value
        label = f"{growth_pct}% (Declining)"
    else:
        direction = TrendDirection.STABLE.value
        label = f"{growth_pct}% (Stable)"

    return {
        "current_count": current_count,
        "previous_count": previous_count,
        "growth_percentage": growth_pct,
        "trend_direction": direction,
        "trend_label": label
    }


# Standard cluster taxonomies for Super App Polri & general mobile apps
DEFAULT_CLUSTERS = [
    {
        "cluster_name": "OTP Delivery & SMS Gateway Timeout",
        "category": "OTP",
        "issue_description": "Users repeatedly report OTP verification codes not arriving via SMS or WhatsApp",
        "severity": "CRITICAL",
        "keywords": ["otp", "kode", "sms", "tidak masuk", "wa", "kode verifikasi"],
    },
    {
        "cluster_name": "SIM Online Verification Failure",
        "category": "SERVICE_AVAILABILITY",
        "issue_description": "Failures during digital driving license (SIM) renewal submission or biometric check",
        "severity": "HIGH",
        "keywords": ["sim", "perpanjang", "biometrik", "foto", "verifikasi wajah"],
    },
    {
        "cluster_name": "App Crash on Android 14 / Splash Screen",
        "category": "APPLICATION_CRASH",
        "issue_description": "Application abruptly closes during startup or camera permission request",
        "severity": "CRITICAL",
        "keywords": ["crash", "force close", "keluar sendiri", "fc", "splash"],
    },
    {
        "cluster_name": "ETLE / Traffic Violation Data Desync",
        "category": "INFORMATION_ACCURACY",
        "issue_description": "Discrepancy or latency in vehicle plate records or paid traffic ticket status",
        "severity": "MEDIUM",
        "keywords": ["etle", "tilang", "plat", "kendaraan", "denda"],
    },
    {
        "cluster_name": "Payment Gateway Timeout",
        "category": "PAYMENT",
        "issue_description": "Transaction pending or virtual account payment status not updated in app",
        "severity": "HIGH",
        "keywords": ["bayar", "va", "virtual account", "briva", "transfer", "gagal bayar"],
    }
]


def match_review_to_cluster(text: str, category: str) -> Optional[str]:
    """Assign review to a known recurring cluster based on category and semantic keywords."""
    text_lower = text.lower()
    for cluster in DEFAULT_CLUSTERS:
        if cluster["category"] == category:
            for kw in cluster["keywords"]:
                if kw in text_lower:
                    return cluster["cluster_name"]

    # Keyword match across all clusters
    for cluster in DEFAULT_CLUSTERS:
        for kw in cluster["keywords"]:
            if kw in text_lower:
                return cluster["cluster_name"]

    return None
