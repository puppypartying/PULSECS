# Market Test Plan: PulseQC

**Institution:** Universitas Padjadjaran  
**Faculty:** Fakultas Ekonomi dan Bisnis (FEB)  
**Program:** Bisnis Digital  
**Course:** Pengembangan Produk / Product Development (UTS Option B)  
**Product:** PulseQC (Near Real-Time Customer Feedback Quality Control Platform)  
**Case Study Application:** Super App Polri (`superapps.polri.presisi.presisi`)

---

## 1. Research & Market Hypotheses

### 1.1 Problem Hypothesis
> Organizations operating high-volume digital mobile applications receive user feedback continuously through app store reviews but lack sufficient human resources to manually read, categorize, and prioritize all incoming feedback in near real-time, resulting in delayed detection of critical defects and operational bottlenecks.

### 1.2 Customer Hypothesis
> Operations quality control leads, customer experience managers, and product managers at public sector or enterprise app operators (e.g. Super App Polri management) actively seek structured triage and bottleneck monitoring tools to accelerate complaint response without risking automated hallucinations.

### 1.3 Value Proposition Hypothesis
> PulseQC converts raw, unstructured application store reviews into structured, prioritized, and explainable operational information, allowing human teams to identify critical customer complaints significantly faster than manual review screening while maintaining human oversight.

### 1.4 Product Hypothesis
> "PulseQC-assisted operators can identify and prioritize critical customer complaints at least 30% faster than operators using manual review processing, while achieving at least 80% category and priority classification accuracy against verified human ground truth."

*Important Note: This success criterion is a proposed test benchmark only; it must not be reported as a measured outcome until empirical experiment data has been collected.*

---

## 2. Controlled Experiment Design

A randomized within-subject / between-condition controlled experiment will be conducted using the PulseQC Research Evaluation module.

### 2.1 Experimental Conditions

1. **Condition A: CONTROL (Manual Workflow)**
   - Operators review raw, unstructured Google Play reviews in chronological order (simulating standard Google Play Console or spreadsheet review).
   - Operators manually read the text, determine if it is a critical complaint, classify the category, and assign a priority (P1–P4).
   - Timestamp is recorded from display to operator completion for each review.

2. **Condition B: TREATMENT (PulseQC-Assisted Workflow)**
   - Operators review the same review batch within the PulseQC QC Queue.
   - The queue displays pre-scored priority tiers (P1–P4), highlighted evidence spans, AI-suggested categories, and deterministic priority reasons.
   - Operators verify or override the classification and take QC action (`UNDER_REVIEW`, `INVESTIGATING`, `RESOLVED`).
   - Timestamp is recorded from display to operator action.

### 2.2 Target Sample
- **Participants:** $N = 20$ participants (comprising digital business students, product managers, and customer operations personnel).
- **Review Dataset:** 50 standardized Google Play reviews from Super App Polri (`superapps.polri.presisi.presisi`), containing a calibrated mixture of:
  - Critical defects (P1: OTP failure, crash on Android 14)
  - Severe issues (P2: payment delay, face biometric failure)
  - Moderate usability issues (P3: UI confusion, slow loading)
  - Low priority / positive feedback (P4: praises, feature requests)

---

## 3. Quantitative Measurements & Metrics

| Metric Dimension | Specific Variable | Unit of Measure | Measurement Tool |
|---|---|---|---|
| **Speed (Primary)** | Time to Identify Critical Complaint | Seconds / Review | In-app experiment timer |
| **Speed (Secondary)** | Total Triage Processing Time | Seconds / Batch | In-app experiment timer |
| **Quality** | Classification Accuracy vs Ground Truth | Percentage (%) | Confusion Matrix in Research Module |
| **Prioritization** | Priority Tier Agreement Rate | Percentage (%) | Research evaluation engine |
| **False Positives** | Non-critical reviews flagged as P1 | Count & Rate (%) | Error distribution matrix |
| **False Negatives** | Critical reviews missed as P3/P4 | Count & Rate (%) | Error distribution matrix |
| **Workload** | NASA-TLX Subjective Mental Workload | Scale 1 to 10 | Post-experiment questionnaire |

---

## 4. Evaluation Criteria & Decision Rules

### 4.1 Success Criterion
- Median time to identify critical (P1) complaints in Treatment is $\ge 30\%$ lower than Control ($\Delta \text{Time} \ge 30\%$).
- Classification accuracy $\ge 80\%$ compared to human ground truth.
- Subjective operator mental workload score decreases by at least 2 points on a 10-point scale.

### 4.2 Failure Criterion
- Time reduction is $< 10\%$ or statistically insignificant ($p > 0.05$).
- Classification accuracy $< 70\%$, causing operators to spend excessive time correcting AI mistakes.
- High false negative rate ($> 5\%$) where critical P1 complaints are buried in low-priority tiers.

### 4.3 Decision Rule Framework
- **CONTINUE TO PILOT:** If success criteria are met, proceed to propose a pilot deployment with the Super App Polri operations stakeholders.
- **ITERATE:** If time reduction is between $10\% - 29\%$ or accuracy is between $70\% - 79\%$, refine prompt engineering, fine-tune category boundaries, and calibrate priority thresholds.
- **PIVOT:** If operators find review triage non-essential and instead demand automated Jira/ticketing synchronization or public auto-reply generation.
- **STOP:** If empirical testing demonstrates that human review of raw text is equally fast and more reliable than assisted triage.

---

## 5. Ethical Guidelines & Research Integrity

1. **No Fabricated Numbers:** Results must be calculated solely from actual participant sessions recorded in the `market_test_records` table.
2. **Reviewer Privacy:** All reviewer names in experimental test sets must be pseudonymized using author masking.
3. **Transparent Reporting:** Negative results, false negatives, and operator errors must be fully disclosed in the final UTS research report.
