import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Users,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BottleneckMetrics } from '../types';

interface BottleneckMonitorPageProps {
  onSelectReview?: (id: number) => void;
  onNavigateToQueue?: () => void;
}

export const BottleneckMonitorPage: React.FC<BottleneckMonitorPageProps> = ({
  onSelectReview,
  onNavigateToQueue,
}) => {
  const [data, setData] = useState<BottleneckMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBottlenecks = () => {
    setLoading(true);
    fetch('/api/bottlenecks')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(err => console.error('Error fetching bottleneck metrics:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBottlenecks();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Computing operational bottleneck metrics...</div>;
  }

  const categoryList = Object.entries(data?.categoryBacklog || {}).sort((a, b) => b[1] - a[1]);
  const operatorList = Object.entries(data?.operatorWorkload || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          Operational Bottleneck Monitor
        </h2>
        <p className="text-xs text-slate-400">
          Real-time queue latency telemetry, SLA breach tracking, and operator workload balancing.
        </p>
      </div>

      {/* Automated Diagnostic Alerts Banner (Supported strictly by actual data) */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                alert.type === 'CRITICAL'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : alert.type === 'WARNING'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{alert.message}</span>
                <span className="text-[11px] opacity-80 mt-0.5 block">Evidence: {alert.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottleneck KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Open P1 Cases</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400">{data?.p1Open || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Target SLA: 60 minutes</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>P1 SLA Breaches</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">{data?.slaBreachesP1 || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cases exceeding 60m SLA</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Average Queue Age</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{data?.avgQueueAgeMinutes || 0} min</div>
          <div className="text-[11px] text-slate-500 mt-1">Median: {data?.medianQueueAgeMinutes || 0} min</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Oldest Open Case</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{data?.oldestCaseAgeMinutes || 0} min</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data?.oldestCaseId ? `Case #${data.oldestCaseId}` : 'Queue empty'}
          </div>
        </div>
      </div>

      {/* Backlog Distributions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Backlog */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Unresolved Complaints by Category
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Top: <strong className="text-indigo-300">{data?.topUnresolvedCategory}</strong>
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {categoryList.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No active category backlog.</div>
            ) : (
              categoryList.map(([cat, count]) => {
                const total = data?.totalOpenCases || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={cat} className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-medium">{cat.replace(/_/g, ' ')}</span>
                      <span className="text-slate-400">{count} cases ({pct}%)</span>
                    </div>
                    <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Operator Workload Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              Operator Workload Distribution
            </h3>
            <span className="text-xs text-slate-500">
              Total Active: {data?.totalOpenCases} cases
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {operatorList.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No assigned cases.</div>
            ) : (
              operatorList.map(([op, count]) => {
                const total = data?.totalOpenCases || 1;
                const pct = Math.round((count / total) * 100);
                const isUnassigned = op === 'Unassigned';
                return (
                  <div key={op} className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span className={`font-semibold ${isUnassigned ? 'text-amber-400' : 'text-slate-200'}`}>
                        {op}
                      </span>
                      <span className="text-slate-400">{count} open cases ({pct}%)</span>
                    </div>
                    <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isUnassigned ? 'bg-amber-400' : 'bg-cyan-500'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
