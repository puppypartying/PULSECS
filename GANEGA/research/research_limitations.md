# Research Limitations & Ethical Considerations: PulseQC

**Institution:** Universitas Padjadjaran, FEB Digital Business  
**Course:** Pengembangan Produk / Product Development (UTS)  
**Platform:** PulseQC — Near Real-Time Customer Feedback Quality Control Platform  
**Case Study:** Super App Polri (`superapps.polri.presisi.presisi`)

---

## 1. Technological & Operational Limitations

### 1.1 Google Play API Authorization Requirements
Access to the official Google Play Android Publisher API (`reviews.list`) strictly requires ownership or delegated managerial permissions inside the target app's Google Play Console account. Knowing a public Android package name (`superapps.polri.presisi.presisi`) does **not** grant API access. When official credentials cannot be authorized by the case study organization, PulseQC operates transparently via:
- Historical Google Play Console CSV exports (`HISTORICAL_GOOGLE_PLAY_EXPORT`)
- Verified synthetic testing pipelines (`SYNTHETIC_DEMO`)
- *Ethical rule:* Scraped web HTML or fabricated live claims are strictly forbidden.

### 1.2 Near Real-Time Polling vs. Event-Driven Webhooks
Google Play does not provide public real-time webhooks for incoming user reviews. Therefore, PulseQC implements a **near real-time polling architecture** (default interval: 300 seconds / 5 minutes). Ingestion latency is mathematically bounded by the polling cycle and API quota limits.

### 1.3 Review Availability Window
Google Play Publisher API returns only reviews created or modified within a rolling window (typically recent weeks) and caps page retrieval. Comprehensive multi-year historical analysis must rely on official Play Console bulk export CSVs.

---

## 2. Analytical & Statistical Limitations

### 2.1 Selection & Negativity Bias in App Store Reviews
App store reviewers are not a representative sample of total app active users. Reviews suffer from bi-modal selection bias: users with severe grievances (1-star) and enthusiastic brand champions (5-star) over-index, while satisfied users rarely leave comments. Feedback metrics must not be interpreted as overall population satisfaction without statistical reweighting.

### 2.2 Inability to Infer Internal Root Causes
A customer stating *"Aplikasi tidak bisa dibuka / error kode 500"* is reporting a symptom, not an internal architectural cause. It is methodologically invalid for an AI to state *"The database server crashed"* based purely on review text. PulseQC strictly limits AI outputs to *"Reported issue"* and extracts exact `evidence_span` quotes.

### 2.3 Non-Causal Nature of Release Trend Comparisons
Spikes in complaint volume coinciding with a new app version (e.g. v1.4.3) are **associated with** the release, but correlation does not prove causation without examining external factors (e.g., nationwide telecom SMS gateway outages, Dukcapil maintenance windows).

### 2.4 AI Classification Uncertainty & Fallibility
Language models (including Gemini) are probabilistic systems subject to error, ambiguous colloquial slang (e.g., Indonesian slang like *"lemot parah"*, *"force close"*, *"muter2"*), and cultural context nuances. AI classifications are recommendations, requiring human-in-the-loop operational verification.

---

## 3. Academic Integrity & Market Testing Stance

1. **No Fabricated Data:** Empirical numbers (time reductions, accuracy scores, market adoption) must be measured from real experiment sessions.
2. **Product Feasibility $\neq$ Market Demand:** Demonstrating that PulseQC runs without errors does not prove that organizations will buy or adopt it. Adoption requires empirical field trials and procurement alignment.
