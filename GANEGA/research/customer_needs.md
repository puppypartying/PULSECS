# Customer Needs Analysis: PulseQC

**Course:** Pengembangan Produk / Product Development (UTS)  
**Target Organization Archetype:** Public Sector & Enterprise Mobile App Operators (Case Study: Super App Polri)

---

## Customer Needs Register

| # | Customer Need | Operational Pain Point | Evidence Description | Relative Importance | Evidence Status |
|---|---|---|---|---|---|
| **CN1** | **Rapid triage of critical service disruptions** | Operations teams take hours or days to notice that an app store release broke authentication or payment for thousands of users. | Review archives for Super App Polri show clusters of 1-star reviews stating "OTP tidak masuk" lasting days before being answered. | **Critical (Must-Have)** | **[OBSERVED]** *(Documented in Play Store review history)* |
| **CN2** | **Explainable categorization without AI hallucinations** | Operators distrust black-box AI tools that invent technical causes (e.g. claiming "backend server crash") not supported by review text. | Subject matter interviews indicate operational teams discard generic LLM summaries that lack traceable quotes. | **High (Must-Have)** | **[ASSUMPTION]** *(To be validated in UTS experiment)* |
| **CN3** | **Transparent, rule-based priority scoring** | Subjective triage by different operators leads to inconsistent handling; low-priority praise is often addressed before critical defects. | Discrepancies in response times across different review categories in public store listings. | **High (Must-Have)** | **[OBSERVED]** *(Observed in manual review workflows)* |
| **CN4** | **Queue aging and bottleneck tracking (SLA visibility)** | Team leads cannot see how long unresolved complaints have been waiting or which operators are overloaded. | Standard Google Play Console interface provides no queue age counters or SLA breach alerts. | **High (Should-Have)** | **[ASSUMPTION]** *(Awaiting survey validation)* |
| **CN5** | **Recurring issue clustering and post-release trend tracking** | Difficulty discerning whether an issue is an isolated user glitch or a systemic defect affecting a release version. | Post-release version spikes (e.g. v1.4.3) coincide with sudden surges in specific complaint categories. | **Medium (Should-Have)** | **[OBSERVED]** *(Historical data correlation)* |
| **CN6** | **Human-controlled workflow with immutable audit accountability** | Public organizations cannot risk automated bots publishing misleading or legally problematic public replies. | Regulatory constraints and public relations guidelines in Indonesian public services. | **Critical (Must-Have)** | **[VERIFIED]** *(Standard public sector governance rule)* |
