"""
PulseQC x Streamlit
Taruh file ini di ROOT project (sejajar sama folder `pulseqc/` dan `pulseqc.db`).
Jalankan:  streamlit run streamlit_app.py
"""

import json
import pandas as pd
import streamlit as st

from pulseqc.config import Config
from pulseqc.database import init_db, get_connection
from pulseqc.analytics import get_bottleneck_metrics
from pulseqc.qc_service import update_qc_case_status, assign_qc_case
from pulseqc.privacy import mask_author_name  # kalau nama fungsinya beda, sesuaikan

st.set_page_config(page_title="PulseQC", page_icon="🩺", layout="wide")
init_db()  # aman dipanggil berulang (CREATE TABLE IF NOT EXISTS)


@st.cache_data(ttl=30)  # cache 30 detik biar nggak query terus tiap klik
def query(sql: str, params: tuple = ()) -> pd.DataFrame:
    conn = get_connection()
    try:
        return pd.read_sql_query(sql, conn, params=params)
    finally:
        conn.close()


REVIEWS_SQL = """
SELECT r.id, r.review_created_at, r.star_rating, r.review_text, r.author_name,
       r.app_version_name, r.data_source,
       a.sentiment, a.issue_category, a.severity, a.urgency_score,
       a.complaint_summary, a.evidence_span,
       q.id AS case_id, q.priority, q.priority_score, q.status, q.assigned_to,
       q.priority_reasons
FROM reviews r
LEFT JOIN review_analysis a ON a.review_id = r.id
LEFT JOIN qc_cases q        ON q.review_id = r.id
ORDER BY r.review_created_at DESC
"""

# ---------- Sidebar ----------
st.sidebar.title("PulseQC")
st.sidebar.caption(f"{Config.APP_NAME}\n\n`{Config.APP_PACKAGE_NAME}`")
page = st.sidebar.radio(
    "Menu", ["Overview", "Live Reviews", "QC Queue", "Bottleneck Monitor", "Issue Intelligence"]
)
if st.sidebar.button("🔄 Refresh data"):
    st.cache_data.clear()
    st.rerun()

df = query(REVIEWS_SQL)

# Privacy masking tetap dihormati
if Config.PRIVACY_MASK_AUTHORS and not df.empty:
    df["author_name"] = df["author_name"].apply(lambda x: mask_author_name(x) if x else x)

# ---------- Overview ----------
if page == "Overview":
    st.header("Overview")
    if df.empty:
        st.info("Belum ada data. Jalankan `python3 worker.py --once` atau import CSV dulu.")
    else:
        open_mask = ~df["status"].isin(["RESOLVED", "CLOSED"])
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Reviews", len(df))
        c2.metric("Negative %", f"{(df['sentiment'] == 'NEGATIVE').mean() * 100:.0f}%")
        c3.metric("Critical", int((df["severity"] == "CRITICAL").sum()))
        c4.metric("Open P1/P2", int((open_mask & df["priority"].isin(["P1", "P2"])).sum()))

        left, right = st.columns(2)
        left.subheader("Rating distribution")
        left.bar_chart(df["star_rating"].value_counts().sort_index())
        right.subheader("Kategori issue")
        right.bar_chart(df["issue_category"].value_counts())

        st.caption("Sumber data: " + ", ".join(f"{k} ({v})" for k, v in df["data_source"].value_counts().items()))

# ---------- Live Reviews ----------
elif page == "Live Reviews":
    st.header("Live Reviews")
    f1, f2, f3, f4 = st.columns(4)
    sent = f1.multiselect("Sentiment", sorted(df["sentiment"].dropna().unique()))
    sev = f2.multiselect("Severity", sorted(df["severity"].dropna().unique()))
    pri = f3.multiselect("Priority", sorted(df["priority"].dropna().unique()))
    src = f4.multiselect("Data source", sorted(df["data_source"].dropna().unique()))

    view = df.copy()
    for col, vals in [("sentiment", sent), ("severity", sev), ("priority", pri), ("data_source", src)]:
        if vals:
            view = view[view[col].isin(vals)]

    st.dataframe(
        view[["review_created_at", "star_rating", "review_text", "sentiment",
              "issue_category", "severity", "priority", "status", "data_source"]],
        width="stretch", hide_index=True,
    )

    with st.expander("Detail review"):
        if not view.empty:
            rid = st.selectbox("Pilih review ID", view["id"])
            row = view[view["id"] == rid].iloc[0]
            st.write(row["review_text"])
            st.markdown(f"**Evidence span:** `{row['evidence_span']}`")
            st.markdown(f"**Ringkasan AI:** {row['complaint_summary']}")
            if row["priority_reasons"]:
                st.markdown("**Alasan prioritas:**")
                for reason in json.loads(row["priority_reasons"]):
                    st.markdown(f"- {reason}")

# ---------- QC Queue ----------
elif page == "QC Queue":
    st.header("QC Queue")
    queue = df[df["case_id"].notna() & ~df["status"].isin(["RESOLVED", "CLOSED"])].sort_values(
        "priority_score", ascending=False
    )
    st.dataframe(
        queue[["case_id", "priority", "priority_score", "status", "assigned_to",
               "issue_category", "complaint_summary"]],
        width="stretch", hide_index=True,
    )

    if not queue.empty:
        st.subheader("Update case")
        with st.form("update_case"):
            case_id = int(st.selectbox("Case ID", queue["case_id"].astype(int)))
            new_status = st.selectbox(
                "Status baru", ["NEW", "UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "CLOSED"]
            )
            operator = st.text_input("Assign ke operator (opsional)")
            note = st.text_area("Resolution note (opsional)")
            if st.form_submit_button("Simpan"):
                update_qc_case_status(case_id, new_status, performed_by=operator or "Operator",
                                      resolution_note=note or None)
                if operator:
                    assign_qc_case(case_id, operator, performed_by=operator)
                st.cache_data.clear()
                st.success(f"Case #{case_id} → {new_status}")
                st.rerun()

# ---------- Bottleneck Monitor ----------
elif page == "Bottleneck Monitor":
    st.header("Bottleneck Monitor")
    m = get_bottleneck_metrics()  # langsung pakai fungsi yang sudah ada
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Open cases", m["total_open_cases"])
    c2.metric("P1 SLA breached", m["sla_breaches_p1"])
    c3.metric("Avg queue age (min)", m["avg_queue_age_minutes"])
    c4.metric("Median queue age (min)", m["median_queue_age_minutes"])

    for a in m["alerts"]:
        {"CRITICAL": st.error, "WARNING": st.warning}.get(a["type"], st.info)(a["message"])

    l, r = st.columns(2)
    l.subheader("Backlog per kategori")
    l.bar_chart(pd.Series(m["category_backlog"]))
    r.subheader("Workload per operator")
    r.bar_chart(pd.Series(m["operator_workload"]))

# ---------- Issue Intelligence ----------
elif page == "Issue Intelligence":
    st.header("Issue Intelligence")
    clusters = query("SELECT * FROM issue_clusters ORDER BY occurrence_count DESC")
    if clusters.empty:
        st.info("Belum ada cluster. Cluster dibuat oleh worker / issue_clustering.")
    else:
        st.dataframe(clusters, width="stretch", hide_index=True)
