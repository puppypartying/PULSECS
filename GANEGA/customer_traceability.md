# Customer Traceability Matrix: PulseQC

**Institution:** Universitas Padjadjaran  
**Faculty:** Fakultas Ekonomi dan Bisnis (FEB)  
**Program:** Bisnis Digital  
**Course:** Pengembangan Produk / Product Development (UTS Option B)  
**Case Study Application:** Super App Polri (`superapps.polri.presisi.presisi`)

---

## 1. Traceability Chain Framework

Every product feature in PulseQC must directly map through this evidentiary chain:

$$\text{Observation} \longrightarrow \text{Customer Problem} \longrightarrow \text{Customer Need} \longrightarrow \text{Evidence} \longrightarrow \text{Product Feature} \longrightarrow \text{Customer Value} \longrightarrow \text{Measurement Metric}$$

Research Evidence Status Labels:
- **[ASSUMPTION]**: Hypothesized based on user problem discovery; awaiting empirical testing.
- **[OBSERVED]**: Documented qualitative observation from app store reviews or initial user interviews.
- **[MEASURED]**: Quantified through controlled experiment or direct instrumentation.
- **[VERIFIED]**: Formally confirmed through verified API integration or reproducible field trial.

---

## 2. Customer Need to Feature Traceability

### Item 1: Rapid Identification of Critical Service Interruptions
- **Customer Need:** Public sector and digital business operations teams need to discover critical service disruptions immediately when users report them.
- **Pain Point:** In high-volume mobile apps (e.g., Super App Polri), hundreds of store reviews arrive daily. Manual reading takes hours, leading to delayed discovery of critical defects (e.g., OTP gateway timeouts, login crashes).
- **Evidence:** 
  - *Status:* **[OBSERVED]**
  - *Evidence Note:* Public reviews for `superapps.polri.presisi.presisi` exhibit recurring clusters stating "OTP tidak masuk" and "force close di Android 14" spanning multiple release cycles without prompt acknowledgment.
- **Product Feature:** Near Real-Time Review Polling & Ingestion Worker (`worker.py`) coupled with Deterministic Priority Engine (P1–P4 triage).
- **Customer Value:** P1 critical defects (crashes, OTP blockades) are isolated within minutes rather than days.
- **Measurement Metric:** *Time to Identify Critical Complaints (Minutes)* [Target: $\le 15$ min vs. manual $\ge 120$ min].

---

### Item 2: Transparent & Auditable Complaint Classification
- **Customer Need:** Quality control operators need standardized, explainable categorization of feedback without black-box hallucinations.
- **Pain Point:** Generic LLM chatbots invent root causes (e.g. claiming "backend server is down" when the user merely said "cannot login"). Inconsistent human categorization creates misrouted tickets.
- **Evidence:** 
  - *Status:* **[ASSUMPTION]** (To be validated in UTS Market Experiment)
  - *Evidence Note:* Manual review categorization varies significantly across different customer service personnel.
- **Product Feature:** Non-Hallucinatory AI Classifier with Mandatory Evidence Spans (`pulseqc/ai_classifier.py`). Extracts exact substring from user text and restricts root-cause claims.
- **Customer Value:** Operators can trust the categorization and immediately verify the highlighted review text snippet without reading 500-word rants.
- **Measurement Metric:** *Classification Accuracy (%)* and *Evidence Span Precision (%)*.

---

### Item 3: Operational Bottleneck & SLA Visibility
- **Customer Need:** Operations managers need to see where reviews get stuck in the queue and whether SLAs are being breached.
- **Pain Point:** Teams read feedback ad-hoc; no queue discipline exists. Old unresolved complaints languish, while multiple staff review the same easy feedback.
- **Evidence:** 
  - *Status:* **[ASSUMPTION]**
  - *Evidence Note:* Operational teams in government and enterprise apps lack structured feedback queues linked to SLAs.
- **Product Feature:** Operational Bottleneck Monitor (`pulseqc/analytics.py` & Dashboard Page 5). Displays queue age distribution, P1/P2 SLA breaches, operator workload skew, and automated bottleneck warnings.
- **Customer Value:** Managers balance operator workloads and eliminate aging backlogs before public sentiment deteriorates.
- **Measurement Metric:** *Average Queue Age (Hours)*, *Median Queue Age*, and *SLA Breach Rate (%)*.

---

### Item 4: Semantic Issue Clustering and Trend Spikes
- **Customer Need:** Product managers and engineering leads need to know if a specific bug is growing, stable, or resolving after a deployment.
- **Pain Point:** Reading reviews individually hides aggregate patterns. A 200% spike in virtual account payment failures might go unnoticed until finance raises an alert.
- **Evidence:** 
  - *Status:* **[OBSERVED]**
  - *Evidence Note:* Review history reveals burst patterns following new app version releases (e.g. v1.4.3).
- **Product Feature:** Issue Intelligence & Period-over-Period Trend Detection (`pulseqc/issue_clustering.py`). Strict zero-division handling (`NEW_ISSUE` when baseline is 0).
- **Customer Value:** Immediate visibility into emerging issue clusters with mathematical growth tracking.
- **Measurement Metric:** *Cluster Growth Percentage (%)* and *Early Spike Detection Latency (Hours)*.

---

### Item 5: Human-in-the-Loop Verification and Accountability
- **Customer Need:** Organizations cannot delegate public service accountability to autonomous AI bots.
- **Pain Point:** Fully autonomous AI systems make embarrassing mistakes or hallucinate public responses.
- **Evidence:** 
  - *Status:* **[VERIFIED]**
  - *Evidence Note:* Public sector governance standards prohibit unvetted automated public commitments.
- **Product Feature:** QC Queue Action Workflow (`NEW` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`) with Immutable Audit Trail (`pulseqc/audit_service.py`).
- **Customer Value:** Human operators retain total authority; all AI classifications can be overridden with documented rationale.
- **Measurement Metric:** *Human Override Rate (%)* and *Audit Trail Completeness (100%)*.

---

### Item 6: Scientific Academic Evaluation of Workflow Efficiency
- **Customer Need:** Researchers and decision-makers need empirical proof of whether AI-assisted triage actually saves time.
- **Pain Point:** Tech vendors claim "10x speedup" with zero empirical baseline or scientific testing.
- **Evidence:** 
  - *Status:* **[MEASURED]** (Instrumentation built into PulseQC Research Evaluation module)
  - *Evidence Note:* Research module records side-by-side processing times and calculates true confusion matrices against human ground truth.
- **Product Feature:** Research Evaluation Module (`pulseqc/research.py` & Dashboard Page 7) with Control vs. Treatment experiment recorder and ground-truth annotation interface.
- **Customer Value:** Enables evidence-based UTS presentation and defensible product decisions.
- **Measurement Metric:** *Processing Time Reduction (%)* and *Confusion Matrix F1-Score*.
