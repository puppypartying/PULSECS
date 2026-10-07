"""
PulseQC AI Classification Service.
Performs non-hallucinatory sentiment, category, severity, urgency, and
evidence-span extraction. Grounded strictly in review text.
"""

import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any
from pulseqc.schemas import ReviewAnalysisResult, Sentiment, IssueCategory, Severity, AnalysisStatus
from pulseqc.config import Config


CLASSIFICATION_PROMPT_TEMPLATE = """You are the AI Review Quality Control Classifier for PulseQC.
Analyze this Google Play customer review for the mobile application: "{app_name}".

STRICT GUIDELINES:
1. NON-HALLUCINATION: Do NOT invent causes. If user says "OTP tidak masuk", the detected issue is "Possible OTP delivery failure", NOT "The SMS gateway server crashed". Use words like "Possible", "Reported", "Appears".
2. EVIDENCE SPAN: The "evidence_span" MUST be an exact quote or minimal substring copied directly from the user's review text.
3. STRUCTURED OUTPUT: Return ONLY valid JSON matching this schema:
{{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "issue_category": "LOGIN_AUTHENTICATION" | "OTP" | "REGISTRATION" | "APPLICATION_CRASH" | "PERFORMANCE" | "PAYMENT" | "ACCOUNT" | "SECURITY" | "INFORMATION_ACCURACY" | "FEATURE_REQUEST" | "USER_INTERFACE" | "ACCESSIBILITY" | "SERVICE_AVAILABILITY" | "OTHER",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "urgency_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "complaint_summary": "<concise 1-sentence summary>",
  "detected_issue": "<reported issue, e.g. Reported OTP delivery delay>",
  "recommended_action": "<operational investigation recommendation>",
  "evidence_span": "<exact substring quote from the text>",
  "repeated_issue_flag": true | false
}}

Customer Review Text:
\"\"\"{review_text}\"\"\"

Star Rating: {star_rating}/5
"""


def analyze_review_text(review_text: str, star_rating: int, app_name: str = Config.APP_NAME) -> ReviewAnalysisResult:
    """Analyze a single review using Gemini API or rule-based fallback."""
    api_key = Config.GEMINI_API_KEY
    if not api_key or api_key == "MY_GEMINI_API_KEY" or len(api_key) < 10:
        return _fallback_rule_analysis(review_text, star_rating)

    prompt = CLASSIFICATION_PROMPT_TEMPLATE.format(
        app_name=app_name,
        review_text=review_text,
        star_rating=star_rating
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{Config.GEMINI_MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "aistudio-build"}
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidate = data.get("candidates", [{}])[0]
            text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
            parsed = json.loads(text)

            res = ReviewAnalysisResult(
                sentiment=parsed.get("sentiment", Sentiment.NEGATIVE.value),
                issue_category=parsed.get("issue_category", IssueCategory.OTHER.value),
                severity=parsed.get("severity", Severity.MEDIUM.value),
                urgency_score=int(parsed.get("urgency_score", 50)),
                confidence_score=int(parsed.get("confidence_score", 85)),
                complaint_summary=parsed.get("complaint_summary", review_text[:80]),
                detected_issue=parsed.get("detected_issue", "Reported customer issue"),
                recommended_action=parsed.get("recommended_action", "Verify operational state"),
                evidence_span=parsed.get("evidence_span", review_text[:40]),
                repeated_issue_flag=bool(parsed.get("repeated_issue_flag", False)),
                analysis_status=AnalysisStatus.COMPLETED.value,
                analysis_model=Config.GEMINI_MODEL,
                analysis_version=Config.ANALYSIS_VERSION
            )
            if res.validate():
                return res
            return _fallback_rule_analysis(review_text, star_rating)
    except Exception as exc:
        # Graceful degradation
        fb = _fallback_rule_analysis(review_text, star_rating)
        fb.analysis_status = AnalysisStatus.PENDING_ANALYSIS.value
        return fb


def _fallback_rule_analysis(text: str, rating: int) -> ReviewAnalysisResult:
    """Deterministic keyword-based analysis when AI model is unreachable or unconfigured."""
    text_lower = text.lower()
    
    # Category detection
    cat = IssueCategory.OTHER.value
    evidence = text[:min(len(text), 40)]
    
    if any(k in text_lower for k in ["otp", "kode", "verifikasi", "sms"]):
        cat = IssueCategory.OTP.value
        for word in ["otp", "kode verifikasi", "tidak masuk", "sms"]:
            if word in text_lower:
                evidence = word
                break
    elif any(k in text_lower for k in ["login", "masuk", "kata sandi", "password", "blokir"]):
        cat = IssueCategory.LOGIN_AUTHENTICATION.value
        evidence = "login" if "login" in text_lower else "masuk"
    elif any(k in text_lower for k in ["daftar", "registrasi", "nik", "ktp", "data"]):
        cat = IssueCategory.REGISTRATION.value
        evidence = "daftar" if "daftar" in text_lower else "registrasi"
    elif any(k in text_lower for k in ["force close", "keluar sendiri", "fc", "crash", "tertutup"]):
        cat = IssueCategory.APPLICATION_CRASH.value
        evidence = "keluar sendiri" if "keluar sendiri" in text_lower else "crash"
    elif any(k in text_lower for k in ["loading", "lemot", "berat", "lag", "lama", "muter"]):
        cat = IssueCategory.PERFORMANCE.value
        evidence = "lemot" if "lemot" in text_lower else "loading"
    elif any(k in text_lower for k in ["bayar", "pembayaran", "transaksi", "saldo", "biaya"]):
        cat = IssueCategory.PAYMENT.value
        evidence = "bayar" if "bayar" in text_lower else "transaksi"
    elif any(k in text_lower for k in ["sim", "skck", "tilang", "etle", "lapor", "layanan"]):
        cat = IssueCategory.SERVICE_AVAILABILITY.value
        evidence = "layanan"

    # Sentiment detection
    if rating <= 2:
        sentiment = Sentiment.NEGATIVE.value
    elif rating == 3:
        sentiment = Sentiment.NEUTRAL.value
    else:
        sentiment = Sentiment.POSITIVE.value

    # Severity detection
    if rating == 1 and cat in [IssueCategory.APPLICATION_CRASH.value, IssueCategory.OTP.value, IssueCategory.LOGIN_AUTHENTICATION.value]:
        sev = Severity.CRITICAL.value
        urgency = 88
    elif rating <= 2:
        sev = Severity.HIGH.value
        urgency = 72
    elif rating == 3:
        sev = Severity.MEDIUM.value
        urgency = 45
    else:
        sev = Severity.LOW.value
        urgency = 15

    return ReviewAnalysisResult(
        sentiment=sentiment,
        issue_category=cat,
        severity=sev,
        urgency_score=urgency,
        confidence_score=78,
        complaint_summary=f"Reported {cat.lower().replace('_', ' ')}: {text[:60]}",
        detected_issue=f"Possible {cat.lower().replace('_', ' ')} anomaly reported by user",
        recommended_action=f"Inspect system telemetry for {cat.lower()}",
        evidence_span=evidence or text[:25],
        repeated_issue_flag=cat in [IssueCategory.OTP.value, IssueCategory.LOGIN_AUTHENTICATION.value],
        analysis_status=AnalysisStatus.COMPLETED.value,
        analysis_model="heuristic-fallback",
        analysis_version=Config.ANALYSIS_VERSION
    )
