# Research Problem Statement: Feedback Ingestion & Triage in High-Volume Digital Services

**Universitas Padjadjaran — FEB Bisnis Digital**  
**Course:** Pengembangan Produk / Product Development (UTS)  
**Case Study Focus:** Super App Polri (`superapps.polri.presisi.presisi`)

---

## 1. Problem Context

In modern digital public service delivery and digital business operations, the official app store (Google Play Store) serves as the primary direct channel through which citizens and consumers voice operational feedback, report defects, and express frustration. 

For critical public service platforms such as **Super App Polri**—which consolidates digital driver's license renewal (SINAR), online police criminal records (SKCK), traffic enforcement tickets (ETLE), and emergency reporting (DUMAS Presisi)—incoming feedback volume can reach hundreds of reviews per day during peak periods.

---

## 2. Core Problem Definition

> **Problem Proposition:** Organizations operating public-facing digital applications receive customer feedback continuously through app store reviews while having limited human operations resources available to manually read, understand, categorize, prioritize, and monitor incoming reviews in near real-time.

This structural operational constraint manifests in several acute failure modes:
1. **Delayed Detection of Critical Bugs:** When an application update introduces a breaking issue (e.g. OTP SMS delivery failure or Android 14 camera crash), hundreds of users report it on Google Play hours before internal monitoring alarms fire. In manual review processing, critical complaints are buried in chronological feeds among star-only ratings and praises.
2. **Inefficient Screening & Resource Waste:** Highly trained operations and QA engineers spend excessive hours reading trivial reviews or duplicate complaints instead of investigating operational bottlenecks.
3. **Inconsistent and Subjective Categorization:** Different human operators classify identical complaints inconsistently (e.g. classifying an OTP SMS timeout as "Login", "Network", "General", or "Account"), destroying quantitative trend traceability.
4. **Lack of Bottleneck Visibility:** Operations managers have no real-time telemetry on queue aging, median time-to-first-action, SLA compliance, or operator workload distribution.

---

## 3. Research Boundaries & Anti-Fabrication Principles

In accordance with academic rigor:
- PulseQC tests whether AI-assisted triage reduces detection latency; it does **not** assume the problem exists at an arbitrary unverified magnitude (e.g., claiming "causes 50% user loss" without empirical data).
- The case study explores Super App Polri as an archetype of high-volume public service apps; the system architecture is strictly decoupled to monitor any Android package name.
