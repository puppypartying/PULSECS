import React, { useState, useEffect } from 'react';
import { User, CheckCircle2 } from 'lucide-react';
import { QCCase } from '../types';

interface QCQueuePageProps {
  onSelectReview: (id: number) => void;
  onRefreshStats?: () => void;
}

export const QCQueuePage: React.FC<QCQueuePageProps> = ({ onSelectReview, onRefreshStats }) => {
  const [cases, setCases] = useState<QCCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchCases = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (priorityFilter) params.append('priority', priorityFilter);
    if (statusFilter) params.append('status', statusFilter);

    fetch(`/api/qc-cases?${params.toString()}`)
      .then(res => res.json())
      .then(d => setCases(d.cases || []))
      .catch(err => console.error('Error fetching QC queue:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCases();
  }, [priorityFilter, statusFilter]);

  const handleQuickStatusUpdate = async (caseId: number, nextStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/qc-cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          performedBy: 'Human Operator',
        }),
      });
      if (res.ok) {
        setActionMsg(`Case #${caseId} updated to ${nextStatus}`);
        setTimeout(() => setActionMsg(null), 2500);
        fetchCases();
        if (onRefreshStats) onRefreshStats();
      }
    } catch {
      setActionMsg('Failed to update case');
    }
  };

  const handleQuickAssign = async (caseId: number, currentAssignee: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Assign operator name:', currentAssignee || 'Andi (DevOps)');
    if (!name) return;

    try {
      const res = await fetch(`/api/qc-cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: name,
          performedBy: 'Supervisor',
        }),
      });
      if (res.ok) {
        fetchCases();
        if (onRefreshStats) onRefreshStats();
      }
    } catch {
      console.error('Failed to assign');
    }
  };

  const p1Count = cases.filter(c => c.priority === 'P1' && c.status !== 'RESOLVED' && c.status !== 'CLOSED').length;
  const p2Count = cases.filter(c => c.priority === 'P2' && c.status !== 'RESOLVED' && c.status !== 'CLOSED').length;

  return (
    <div className="space-y-4 max-w-6xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
            QC Queue
          </h2>
          <span className="text-xs text-zinc-500">
            Operational triage workspace ({cases.length} total)
          </span>
        </div>

        {actionMsg && (
          <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            {actionMsg}
          </span>
        )}
      </div>

      {/* Priority & Status Filters (Linear style tabs) */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Priority Tabs */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 text-[11px] uppercase mr-1">Priority:</span>
          {['', 'P1', 'P2', 'P3', 'P4'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition cursor-pointer ${
                priorityFilter === p
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {p || 'All'}
              {p === 'P1' && p1Count > 0 && <span className="ml-1 text-red-400">({p1Count})</span>}
              {p === 'P2' && p2Count > 0 && <span className="ml-1 text-amber-400">({p2Count})</span>}
            </button>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 text-[11px] uppercase mr-1">Status:</span>
          {['', 'NEW', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {st ? st.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Issue Tracker List */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg divide-y divide-zinc-800/60 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono">
            Loading queue cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono">
            Queue is clear. No matching cases for this filter.
          </div>
        ) : (
          cases.map(c => {
            const isP1 = c.priority === 'P1';
            const isBreached = c.sla?.status === 'SLA_BREACHED';

            return (
              <div
                key={c.case_id}
                onClick={() => onSelectReview(c.review_id)}
                className="p-3 hover:bg-zinc-800/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Priority badge + Issue Title + Category */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                      isP1
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : c.priority === 'P2'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {c.priority}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-100 truncate">
                        {c.detected_issue}
                      </span>
                      <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
                        #{c.case_id}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                      "{c.review_text}"
                    </div>
                  </div>
                </div>

                {/* Right: Reports count + SLA/Age + Status + Obvious Minimal Actions */}
                <div className="flex items-center gap-3 text-[11px] shrink-0 font-mono">
                  {/* Category tag */}
                  <span className="text-zinc-500 hidden sm:inline">
                    {c.issue_category}
                  </span>

                  {/* Queue Age */}
                  <span className={isBreached ? 'text-red-400 font-semibold' : 'text-zinc-400'}>
                    {c.sla?.elapsedMin || 42}m
                  </span>

                  {/* Assignee */}
                  <button
                    onClick={e => handleQuickAssign(c.case_id, c.assigned_to, e)}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition"
                    title="Click to assign"
                  >
                    <User className="w-3 h-3 text-zinc-500" />
                    <span>{c.assigned_to || 'Assign'}</span>
                  </button>

                  {/* Status */}
                  <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-medium">
                    {c.status}
                  </span>

                  {/* Minimal & Obvious Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {c.status === 'NEW' && (
                      <button
                        onClick={e => handleQuickStatusUpdate(c.case_id, 'UNDER_REVIEW', e)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-sans font-medium text-xs transition cursor-pointer"
                      >
                        Review
                      </button>
                    )}

                    {['NEW', 'UNDER_REVIEW'].includes(c.status) && (
                      <button
                        onClick={e => handleQuickStatusUpdate(c.case_id, 'INVESTIGATING', e)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-sans font-medium text-xs transition cursor-pointer"
                      >
                        Investigate
                      </button>
                    )}

                    {['UNDER_REVIEW', 'INVESTIGATING'].includes(c.status) && (
                      <button
                        onClick={e => handleQuickStatusUpdate(c.case_id, 'RESOLVED', e)}
                        className="px-2 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 font-sans font-medium text-xs transition cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
