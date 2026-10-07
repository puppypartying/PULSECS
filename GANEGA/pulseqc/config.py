"""
PulseQC Configuration Module.
Loads environment variables with robust validation and sensible defaults.
Case study: Super App Polri (superapps.polri.presisi.presisi).
"""

import os
from typing import Dict, Any


class Config:
    # Application details
    APP_NAME: str = os.getenv("APP_NAME", "Super App Polri")
    APP_PACKAGE_NAME: str = os.getenv("APP_PACKAGE_NAME", "superapps.polri.presisi.presisi")
    
    # Database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pulseqc.db")
    DB_FILE_PATH: str = os.getenv("DB_FILE_PATH", "./pulseqc.db")
    
    # Google Play Developer API
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    PLAY_API_BASE_URL: str = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
    
    # Ingestion & Polling
    SYNC_POLLING_INTERVAL_SECONDS: int = int(os.getenv("SYNC_POLLING_INTERVAL_SECONDS", "300"))
    MAX_API_REQUESTS_PER_CYCLE: int = int(os.getenv("MAX_API_REQUESTS_PER_CYCLE", "20"))
    RETRY_LIMIT: int = int(os.getenv("RETRY_LIMIT", "3"))
    BACKOFF_SECONDS: float = float(os.getenv("BACKOFF_SECONDS", "2.0"))
    
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    ANALYSIS_VERSION: str = "v1.2.0"
    
    # Privacy
    PRIVACY_MASK_AUTHORS: bool = os.getenv("PRIVACY_MASK_AUTHORS", "true").lower() in ("true", "1", "yes")
    
    # Priority engine thresholds (0-100 score)
    PRIORITY_P1_MIN: int = 80
    PRIORITY_P2_MIN: int = 60
    PRIORITY_P3_MIN: int = 30
    
    # SLA Targets (in minutes)
    SLA_MINUTES_P1: int = 60       # 1 hour
    SLA_MINUTES_P2: int = 240      # 4 hours
    SLA_MINUTES_P3: int = 1440     # 24 hours
    SLA_MINUTES_P4: int = 4320     # 72 hours
    
    @classmethod
    def validate(cls) -> Dict[str, Any]:
        """Validate startup configuration and return diagnostics."""
        issues = []
        if not cls.APP_NAME:
            issues.append("APP_NAME cannot be empty")
        if not cls.APP_PACKAGE_NAME or "." not in cls.APP_PACKAGE_NAME:
            issues.append(f"APP_PACKAGE_NAME '{cls.APP_PACKAGE_NAME}' must be a valid Android package identifier")
        if cls.SYNC_POLLING_INTERVAL_SECONDS < 10:
            issues.append("SYNC_POLLING_INTERVAL_SECONDS must be at least 10 seconds")
        if cls.PRIORITY_P1_MIN <= cls.PRIORITY_P2_MIN or cls.PRIORITY_P2_MIN <= cls.PRIORITY_P3_MIN:
            issues.append("Priority thresholds must satisfy: P1 > P2 > P3")
            
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "app_name": cls.APP_NAME,
            "app_package_name": cls.APP_PACKAGE_NAME,
            "database_url": cls.DATABASE_URL,
            "gemini_model": cls.GEMINI_MODEL,
            "has_gemini_key": bool(cls.GEMINI_API_KEY),
            "has_credentials": bool(cls.GOOGLE_APPLICATION_CREDENTIALS),
            "polling_interval": cls.SYNC_POLLING_INTERVAL_SECONDS,
        }
