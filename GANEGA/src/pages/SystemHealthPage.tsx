import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { SystemHealth } from '../types';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealthData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/health').then(r => r.json()),
      fetch('/api/sync/logs').then(r => r.json()),
    ])
      .then(([h, l]) => {
        setHealth(h);
        setSyncLogs(l.logs || []);
      })
      .catch(err => console.error('Error fetching health:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const diag = health?.diagnostics;

  const rows = [
    { name: 'Google Play Publisher API', data: diag?.googleApi },
    { name: 'Play Console Authorization', data: diag?.playConsole },
    { name: 'Package Access (superapps.polri.presisi.presisi)', data: diag?.packageAccess },
    { name: 'Reviews List Endpoint', data: diag?.reviewEndpoint },
    { name: 'Credential Availability', data: diag?.credentials },
    { name: 'Database Connectivity (SQLite)', data: diag?.database },
    { name: 'Gemini AI API', data: diag?.gemini },
    { name: 'Worker Polling Heartbeat', data: diag?.worker },
  ];

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
            System Health & Diagnostic Status
          </h2>
          <p className="text-xs text-zinc-500">
            Internal service status, credentials, and API quota tracking
          </p>
        </div>

        <button
          onClick={fetchHealthData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs font-medium cursor-pointer transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Simple Status Table */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs text-zinc-300 border-collapse">
          <thead className="bg-[#090d16] text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-800/80">
            <tr>
              <th className="py-2.5 px-4 font-medium">Component</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Diagnostic Details</th>
              <th className="py-2.5 px-4 font-medium text-right">Action Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {rows.map((row, i) => {
              const isPass = row.data?.status === 'PASS';
              return (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 font-medium text-zinc-200">
                    {row.name}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`font-mono text-[11px] font-medium ${
                        isPass ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {row.data?.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400 text-xs max-w-sm">
                    {row.data?.explanation || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-500 font-mono text-[11px] text-right">
                    {row.data?.action || 'None'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* API Quota & Sync Overview */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          API Quota & Ingestion Activity
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-zinc-500 font-mono text-[11px]">API REQUESTS THIS CYCLE</div>
            <div className="text-lg font-mono font-medium text-zinc-200 mt-0.5">
              {health?.metrics?.apiRequestsThisHour || 1} / 200
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-mono text-[11px]">TOTAL STORE REVIEWS</div>
            <div className="text-lg font-mono font-medium text-zinc-200 mt-0.5">
              {health?.metrics?.totalReviews || 0}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-mono text-[11px]">PENDING AI TRIAGE</div>
            <div className="text-lg font-mono font-medium text-zinc-200 mt-0.5">
              {health?.metrics?.pendingAnalysis || 0}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-mono text-[11px]">LAST SYNC</div>
            <div className="text-lg font-mono font-medium text-zinc-200 mt-0.5">
              {health?.metrics?.lastSync ? new Date(health.metrics.lastSync).toLocaleTimeString() : 'Initial'}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-[#090d16] border-b border-zinc-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Recent Synchronization Logs
          </span>
        </div>

        <table className="w-full text-left text-xs text-zinc-300 border-collapse">
          <thead className="text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-800/60">
            <tr>
              <th className="py-2 px-4 font-medium">Timestamp</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Reviews Found</th>
              <th className="py-2 px-3 font-medium">New / Updated</th>
              <th className="py-2 px-4 font-medium text-right">Log Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
            {syncLogs.slice(0, 6).map(log => (
              <tr key={log.id} className="hover:bg-zinc-800/30">
                <td className="py-2 px-4 text-zinc-500 text-[11px]">
                  {new Date(log.started_at).toLocaleTimeString()}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={
                      log.status === 'SUCCESS' ? 'text-emerald-400 font-medium' : 'text-zinc-400'
                    }
                  >
                    {log.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-zinc-300">{log.reviews_found}</td>
                <td className="py-2 px-3 text-zinc-400">
                  +{log.new_reviews} / {log.updated_reviews}
                </td>
                <td className="py-2 px-4 text-zinc-500 truncate max-w-xs text-right font-sans text-[11px]">
                  {log.error_message || 'Completed without errors'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
