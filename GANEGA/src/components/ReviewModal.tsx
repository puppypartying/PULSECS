import React, { useState, useEffect } from 'react';
import { X, User, Sparkles } from 'lucide-react';
import { Review } from '../types';

interface ReviewModalProps {
  reviewId: number | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ reviewId, onClose, onStatusUpdated }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewId) return;
    setLoading(true);
    fetch(`/api/reviews/${reviewId}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (d.qcCase) {
          setNewStatus(d.qcCase.status);
          setAssignedTo(d.qcCase.assigned_to || '');
          setOperatorNote(d.qcCase.operator_note || '');
          setResolutionNote(d.qcCase.resolution_note || '');
        }
      })
      .catch(err => console.error('Failed to load review details:', err))
      .finally(() => setLoading(false));
  }, [reviewId]);

  if (!reviewId) return null;

  const handleSaveAction = async () => {
    if (!data?.qcCase?.id) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/qc-cases/${data.qcCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assignedTo: assignedTo || null,
          operatorNote: operatorNote || null,
          resolutionNote: resolutionNote || null,
          performedBy: 'Human Operator',
        }),
      });
      if (res.ok) {
        setSaveMsg('Case updated.');
        setTimeout(() => setSaveMsg(null), 2500);
        if (onStatusUpdated) onStatusUpdated();
        const ref = await fetch(`/api/reviews/${reviewId}`).then(r => r.json());
        setData(ref);
      }
    } catch {
      setSaveMsg('Failed to update case');
    } finally {
      setSaving(false);
    }
  };

  const review = data?.review;
  const analysis = data?.analysis;
  const qcCase = data?.qcCase;
  const auditTrail = data?.auditTrail || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f17] border border-zinc-800 rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col text-zinc-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-[#090d16]">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-semibold">
              #{review?.id || reviewId}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {review?.google_review_id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 font-mono">Loading review...</div>
          ) : (
            <>
              {/* Original Review */}
              <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-medium text-zinc-200">{review?.author_name}</span>
                    <span className="font-mono text-zinc-400">({review?.star_rating}★)</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500 font-mono">
                    <span>v{review?.app_version_name || '1.4.3'}</span>
                    <span>{review?.device || 'Android'}</span>
                    <span>{review?.review_created_at ? new Date(review.review_created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#090d16] rounded border border-zinc-800 text-zinc-200 leading-relaxed font-sans text-xs">
                  "{review?.review_text}"
                </div>

                {/* Evidence Span */}
                {analysis?.evidence_span && (
                  <div className="flex items-start gap-2 bg-[#090d16] border border-zinc-800 rounded p-2 text-[11px]">
                    <span className="text-zinc-500 font-medium shrink-0">Evidence:</span>
                    <span className="text-zinc-300 font-mono italic">
                      "{analysis.evidence_span}"
                    </span>
                  </div>
                )}
              </div>

              {/* Triage & Assessment Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Triage Details */}
                <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Classification
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Sentiment:</span>
                      <span className="font-mono font-medium text-zinc-200">{analysis?.sentiment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Category:</span>
                      <span className="font-mono font-medium text-zinc-200">{analysis?.issue_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Severity:</span>
                      <span className={`font-mono font-semibold ${analysis?.severity === 'CRITICAL' ? 'text-red-400' : 'text-zinc-300'}`}>
                        {analysis?.severity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Urgency:</span>
                      <span className="font-mono text-zinc-300">{analysis?.urgency_score} / 100</span>
                    </div>
                  </div>
                </div>

                {/* Priority Rule Evaluation */}
                <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Priority Evaluation
                    </span>
                    <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[11px] ${
                      qcCase?.priority === 'P1' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {qcCase?.priority} ({qcCase?.priority_score} pts)
                    </span>
                  </div>
                  <ul className="space-y-1 pl-3.5 list-disc text-zinc-400 text-[11px]">
                    {qcCase?.priority_reasons?.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                  {qcCase?.sla && (
                    <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-[11px]">
                      <span className="text-zinc-500">SLA:</span>
                      <span className={qcCase.sla.status === 'SLA_BREACHED' ? 'text-red-400 font-mono font-medium' : 'text-zinc-400 font-mono'}>
                        {qcCase.sla.elapsedMin}m / {qcCase.sla.targetMin}m target
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Operator Action Controls */}
              <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Operational Action
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="w-full bg-[#090d16] border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none"
                    >
                      <option value="NEW">NEW</option>
                      <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Assign Operator</label>
                    <input
                      type="text"
                      placeholder="e.g. Andi (DevOps)"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                      className="w-full bg-[#090d16] border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Operator Note</label>
                  <input
                    type="text"
                    placeholder="Enter internal investigation notes..."
                    value={operatorNote}
                    onChange={e => setOperatorNote(e.target.value)}
                    className="w-full bg-[#090d16] border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                {newStatus === 'RESOLVED' && (
                  <div>
                    <label className="block text-zinc-400 mb-1">Resolution Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Fixed in patch v1.4.4 / SMS queue cleared"
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      className="w-full bg-[#090d16] border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-emerald-400 font-mono text-[11px]">{saveMsg}</span>
                  <button
                    onClick={handleSaveAction}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded font-medium transition cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Apply Action'}
                  </button>
                </div>
              </div>

              {/* Decision Audit Trail */}
              {auditTrail.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Audit Trail
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {auditTrail.map((ev: any, idx: number) => (
                      <div key={idx} className="text-zinc-500 flex items-center justify-between py-0.5 border-b border-zinc-800/40">
                        <span>
                          {ev.action} &rarr; <span className="text-zinc-300">{ev.new_value}</span> by {ev.performed_by}
                        </span>
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
