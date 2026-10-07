import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, CheckCircle2, Clock, Check, BarChart3, AlertCircle } from 'lucide-react';
import { ResearchEvaluation, Review } from '../types';

export const ResearchEvaluationPage: React.FC = () => {
  const [data, setData] = useState<ResearchEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Ground truth form state
  const [selectedReviewId, setSelectedReviewId] = useState<number | ''>('');
  const [trueSentiment, setTrueSentiment] = useState('NEGATIVE');
  const [trueCategory, setTrueCategory] = useState('OTP');
  const [trueSeverity, setTrueSeverity] = useState('CRITICAL');
  const [truePriority, setTruePriority] = useState('P1');
  const [annotator, setAnnotator] = useState('UTS Researcher');
  const [manualTime, setManualTime] = useState<string>('45');
  const [pulseqcTime, setPulseqcTime] = useState<string>('12');
  const [notes, setNotes] = useState('');
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  // Stopwatch experiment simulator
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeCondition, setActiveCondition] = useState<'CONTROL' | 'TREATMENT'>('CONTROL');
  const [trialMsg, setTrialMsg] = useState<string | null>(null);

  const fetchEvaluation = () => {
    setLoading(true);
    fetch('/api/research/evaluation')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(err => console.error('Error fetching research evaluation:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvaluation();
    fetch('/api/reviews?limit=50')
      .then(res => res.json())
      .then(d => setReviews(d.reviews || []));
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleAnnotateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId) {
      alert('Please select a review to annotate');
      return;
    }
    try {
      const res = await fetch('/api/research/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: Number(selectedReviewId),
          trueSentiment,
          trueCategory,
          trueSeverity,
          truePriority,
          annotator,
          manualTimeSec: manualTime ? parseFloat(manualTime) : null,
          pulseqcTimeSec: pulseqcTime ? parseFloat(pulseqcTime) : null,
          notes,
        }),
      });
      if (res.ok) {
        setSubmitMsg('Ground-truth label saved & accuracy recalculated.');
        setTimeout(() => setSubmitMsg(null), 3000);
        fetchEvaluation();
      }
    } catch {
      setSubmitMsg('Error saving annotation');
    }
  };

  const handleRecordTrial = async () => {
    try {
      const res = await fetch('/api/research/experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: activeCondition,
          timeToIdentifySec: timerSeconds,
          timeToPrioritizeSec: timerSeconds + 4,
          respondentId: `P-${Date.now().toString().slice(-4)}`,
          notes: `Trial run (${activeCondition})`,
        }),
      });
      if (res.ok) {
        setTrialMsg(`Recorded ${timerSeconds}s for ${activeCondition}`);
        setTimeout(() => setTrialMsg(null), 3000);
        setTimerRunning(false);
        setTimerSeconds(0);
        fetchEvaluation();
      }
    } catch {
      setTrialMsg('Failed to record trial');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* 1. Experiment Setup Header */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
              Research Evaluation & Market Testing
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              UNPAD UTS Option B
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Status: {data?.status || 'Active'}
          </span>
        </div>

        <div className="bg-[#090d16] p-3.5 rounded border border-zinc-800/80 text-xs">
          <span className="text-zinc-500 font-medium uppercase text-[10px] block mb-1">
            Research Hypothesis:
          </span>
          <p className="text-zinc-200 font-sans italic">
            "{data?.hypothesis || 'PulseQC-assisted operators can identify and prioritize critical customer complaints faster than operators using manual review processing.'}"
          </p>
          <div className="mt-2 text-zinc-400 font-mono text-[11px]">
            Target benchmark: &ge; 30% reduction in median identification time with &ge; 80% category/priority accuracy.
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row: Accuracy & Processing Time */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">Category Accuracy</div>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-100">
            {data?.accuracy?.category !== null ? `${data?.accuracy?.category}%` : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">vs Ground Truth</div>
        </div>

        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">Priority Accuracy</div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-100">
            {data?.accuracy?.priority !== null ? `${data?.accuracy?.priority}%` : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">P1–P4 tier agreement</div>
        </div>

        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">Manual Processing</div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400">
            {data?.processingTime?.controlMeanSec !== null ? `${data?.processingTime?.controlMeanSec}s` : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Control condition mean</div>
        </div>

        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">PulseQC Assisted</div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
            {data?.processingTime?.treatmentMeanSec !== null ? `${data?.processingTime?.treatmentMeanSec}s` : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {data?.processingTime?.timeReductionPct !== null
              ? `-${data?.processingTime?.timeReductionPct}% reduction`
              : 'Treatment mean'}
          </div>
        </div>
      </div>

      {/* 3. Manual vs PulseQC Stopwatch Experiment */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Processing Time Experiment Simulator
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveCondition('CONTROL')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                activeCondition === 'CONTROL'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Control (Manual)
            </button>
            <button
              onClick={() => setActiveCondition('TREATMENT')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                activeCondition === 'TREATMENT'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Treatment (PulseQC)
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#090d16] rounded border border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-mono font-bold text-zinc-200 w-16">
              {timerSeconds}s
            </div>
            <div className="text-xs text-zinc-400">
              Condition: <span className="text-zinc-200 font-mono font-medium">{activeCondition}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {!timerRunning ? (
              <button
                onClick={() => setTimerRunning(true)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition cursor-pointer"
              >
                Start Trial
              </button>
            ) : (
              <button
                onClick={() => setTimerRunning(false)}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/60 rounded font-medium transition cursor-pointer"
              >
                Pause
              </button>
            )}

            <button
              onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}
              className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded transition cursor-pointer"
              title="Reset"
            >
              Reset
            </button>

            <button
              disabled={timerSeconds === 0}
              onClick={handleRecordTrial}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded font-medium transition cursor-pointer"
            >
              Save Data Point
            </button>
          </div>
        </div>

        {trialMsg && (
          <div className="text-xs text-emerald-400 font-mono">
            {trialMsg}
          </div>
        )}
      </div>

      {/* 4. Ground Truth Annotation Panel */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-5 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Ground Truth Annotation Panel
          </h3>
          <p className="text-xs text-zinc-500">
            Human verification labels used to compute accuracy and confusion matrices
          </p>
        </div>

        <form onSubmit={handleAnnotateSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Target Review</label>
              <select
                value={selectedReviewId}
                onChange={e => setSelectedReviewId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none"
              >
                <option value="">-- Select Review --</option>
                {reviews.map(r => (
                  <option key={r.id} value={r.id}>
                    #{r.id} ({r.star_rating}★) "{r.review_text.slice(0, 50)}..."
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">Annotator Name</label>
              <input
                type="text"
                value={annotator}
                onChange={e => setAnnotator(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">True Sentiment</label>
              <select
                value={trueSentiment}
                onChange={e => setTrueSentiment(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              >
                <option value="NEGATIVE">NEGATIVE</option>
                <option value="NEUTRAL">NEUTRAL</option>
                <option value="POSITIVE">POSITIVE</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">True Category</label>
              <select
                value={trueCategory}
                onChange={e => setTrueCategory(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              >
                <option value="OTP">OTP</option>
                <option value="LOGIN_AUTHENTICATION">LOGIN</option>
                <option value="APPLICATION_CRASH">CRASH</option>
                <option value="REGISTRATION">REGISTRATION</option>
                <option value="PERFORMANCE">PERFORMANCE</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="SERVICE_AVAILABILITY">SERVICE AVAIL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">True Severity</label>
              <select
                value={trueSeverity}
                onChange={e => setTrueSeverity(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">True Priority</label>
              <select
                value={truePriority}
                onChange={e => setTruePriority(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-emerald-400 font-mono">{submitMsg}</span>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded font-medium transition cursor-pointer"
            >
              Submit Ground Truth
            </button>
          </div>
        </form>
      </div>

      {/* 5. Confusion Matrix: Sentiment */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Confusion Matrix (Sentiment)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-[#090d16] text-zinc-500 font-mono text-[11px]">
                <th className="p-2 border border-zinc-800 text-left font-medium">True \ Pred</th>
                <th className="p-2 border border-zinc-800 text-zinc-300 font-medium">Pred: POSITIVE</th>
                <th className="p-2 border border-zinc-800 text-zinc-300 font-medium">Pred: NEUTRAL</th>
                <th className="p-2 border border-zinc-800 text-zinc-300 font-medium">Pred: NEGATIVE</th>
              </tr>
            </thead>
            <tbody>
              {['POSITIVE', 'NEUTRAL', 'NEGATIVE'].map(tRow => (
                <tr key={tRow} className="hover:bg-zinc-800/20 font-mono text-xs">
                  <td className="p-2 border border-zinc-800 text-left font-medium text-zinc-400">
                    True: {tRow}
                  </td>
                  {['POSITIVE', 'NEUTRAL', 'NEGATIVE'].map(pCol => {
                    const count = data?.confusionMatrix?.[tRow]?.[pCol] || 0;
                    const isDiagonal = tRow === pCol;
                    return (
                      <td
                        key={pCol}
                        className={`p-2 border border-zinc-800 ${
                          isDiagonal && count > 0
                            ? 'text-emerald-400 font-semibold bg-emerald-500/5'
                            : count > 0
                            ? 'text-red-400'
                            : 'text-zinc-600'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Market Test Decision Framework */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-2 text-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Market Test Decision Rule
        </h3>
        <p className="text-zinc-400 leading-relaxed">
          Decision rules based on empirical UTS experiment results:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
          <div className="p-2 bg-[#090d16] rounded border border-zinc-800 text-zinc-300">
            <span className="font-semibold text-emerald-400 block mb-0.5">CONTINUE</span>
            &ge; 30% time reduction & &ge; 80% accuracy
          </div>
          <div className="p-2 bg-[#090d16] rounded border border-zinc-800 text-zinc-300">
            <span className="font-semibold text-amber-400 block mb-0.5">ITERATE</span>
            10–29% time reduction or 70–79% accuracy
          </div>
          <div className="p-2 bg-[#090d16] rounded border border-zinc-800 text-zinc-300">
            <span className="font-semibold text-blue-400 block mb-0.5">PIVOT</span>
            Low triage adoption; demand for auto-replies
          </div>
          <div className="p-2 bg-[#090d16] rounded border border-zinc-800 text-zinc-300">
            <span className="font-semibold text-red-400 block mb-0.5">STOP</span>
            Manual triage is faster or more accurate
          </div>
        </div>
      </div>
    </div>
  );
};
