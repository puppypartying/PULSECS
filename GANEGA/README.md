# PulseQC: Near Real-Time Customer Feedback Quality Control Platform

> **Academic Context:** Universitas Padjadjaran (UNPAD) — Fakultas Ekonomi dan Bisnis (FEB) — Digital Business  
> **Course:** Pengembangan Produk / Product Development  
> **UTS Assignment:** Option B — Develop Your Own Product  
> **Initial Case Study Target:** Super App Polri (`superapps.polri.presisi.presisi`)  
> *(Fully decoupled: any Android package name can be configured without modifying business logic)*

---

## 1. Executive Summary & Value Proposition

**PulseQC** converts application-store reviews into structured, prioritized, and explainable operational information so human teams can identify, investigate, and resolve critical customer issues faster.

PulseQC is:
- A review ingestion system (Official Google Play Android Publisher API + Historical CSV Export)
- A non-hallucinatory AI-assisted classification engine (grounded in review evidence)
- A deterministic rule-based priority triage queue (P1–P4)
- An operational bottleneck and SLA monitoring platform
- An academic research evaluation module with side-by-side experiment instrumentation

PulseQC is **NOT**:
- A chatbot or autonomous complaint responder
- An automated public reply bot
- A replacement for human decision-makers

---

## 2. Core Architecture

The platform separates ingestion and background processing from dashboard visualization:

```
                      [ Official Google Play Developer API ]
                                        │
                                        ▼
                  [ worker.py (Near Real-Time Polling & Deduplication) ]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [ Gemini 3.8 Flash AI ]        [ Priority Engine ]
              (Evidence-span extractor)      (Deterministic P1–P4)
                         │                             │
                         └──────────────┬──────────────┘
                                        ▼
                      [ SQLite / PostgreSQL Database ]
                        (pulseqc.db / Shared Schema)
                                        ▲
                                        │
               [ Full-Stack Web Application (Node + React + Vite) ]
                    Port 3000 | 10 Specialized Operational Views
```

---

## 3. The 10 Main Platform Views

1. **Overview:** Executive KPIs (Total Reviews, Negative %, Critical Volume, Open P1/P2, Average Queue Age, Rating Distributions, Category Breakdown, Sentiment Matrix).
2. **Live Reviews:** Real-time review feed with multi-dimensional filtering (Sentiment, Rating, Category, Severity, Priority, Data Source, App Version) and sorting.
3. **QC Queue:** Operational triage queue with dynamic SLA countdown badges (`WITHIN_SLA`, `APPROACHING_SLA`, `SLA_BREACHED`), operator assignment, and status controls (`NEW`, `UNDER_REVIEW`, `INVESTIGATING`, `RESOLVED`, `CLOSED`).
4. **Issue Intelligence:** Recurring complaint clustering, period-over-period growth calculation, and trend direction tracking (`INCREASING`, `STABLE`, `DECREASING`, `NEW_ISSUE` with safe zero-baseline handling).
5. **Bottleneck Monitor:** Queue age statistics, median resolution latency, SLA breaches, operator workload distribution, category backlogs, and data-backed diagnostic alerts.
6. **Review Detail:** Deep inspection view displaying raw review text, masked author name, metadata, AI analysis, highlighted evidence span, deterministic priority reasons, and immutable audit timeline.
7. **Research Evaluation (UTS Module):** Dedicated academic module evaluating the primary research question: *"Does AI-assisted review triage help resource-constrained operators identify and prioritize critical customer complaints faster than manual review processing?"* Includes human ground-truth annotation, accuracy metrics, confusion matrices, and timed Control vs. Treatment experiment recorders.
8. **System Health:** In-app diagnostic wizard showing connection status for credentials, Google Play API, package access, reviews endpoint, database, Gemini API, and worker heartbeat.
9. **Data Import:** Drag-and-drop parser for official Google Play Console CSV exports with schema mapping, duplicate detection, and historical dataset tagging.
10. **Settings:** Dynamic system settings (App Name, Package Name, Polling Interval, Priority Thresholds, SLA Targets, AI Model, Author Privacy Masking) without secret leakage.

---

## 4. Academic Research Integrity & Anti-Fabrication Rule

- Every record in PulseQC is explicitly labeled with its `data_source`:
  - `REAL_GOOGLE_PLAY`
  - `HISTORICAL_GOOGLE_PLAY_EXPORT`
  - `SYNTHETIC_DEMO`
- The system never fabricates live API responses or claims connectivity when access is unauthorized.
- All research evaluation numbers (accuracy, time reduction, confusion matrix) are derived strictly from entered annotations and recorded participant sessions.

---

## 5. Execution & Verification Commands

### 5.1 Run Full Test Suite (Unittest)
```bash
python3 -m unittest tests/test_pulseqc.py
```
*Validates configuration, priority engine rules, cluster zero-division safety, SLA calculations, duplicate prevention idempotency, and CSV import.*

### 5.2 Run Diagnostic Health Check
```bash
python3 healthcheck.py
```
*Evaluates database, credentials, Google Play API, package permissions, Gemini status, and worker heartbeat.*

### 5.3 Run Synchronization Worker
Single execution cycle:
```bash
python3 worker.py --once
```
Continuous background polling:
```bash
python3 worker.py
```

### 5.4 Run Full-Stack Web Platform
```bash
npm run dev
```
*Launches Express server and Vite React frontend at `http://0.0.0.0:3000`.*

---

## 6. Configurable Case Study
To monitor a different Android application, update `.env` or navigate to the in-app **Settings** page:
```env
APP_NAME="Another App"
APP_PACKAGE_NAME="com.example.anotherapp"
```
No code rewrites or schema migrations required.
