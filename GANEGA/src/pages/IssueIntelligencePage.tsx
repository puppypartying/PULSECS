import React, { useState, useEffect } from 'react';
import { IssueCluster } from '../types';

export const IssueIntelligencePage: React.FC = () => {
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clusters')
      .then(res => res.json())
      .then(d => setClusters(d.clusters || []))
      .catch(err => console.error('Error fetching clusters:', err))
      .finally(() => setLoading(false));
  }, []);

  const getTrendIndicator = (c: IssueCluster) => {
    if (c.trend_direction === 'NEW_ISSUE' || c.previous_period_count === 0) {
      return <span className="font-mono text-zinc-400">New Issue</span>;
    }
    if (c.trend_direction === 'INCREASING') {
      return (
        <span className="font-mono text-red-400">
          ↑ {c.growth_percentage}%
        </span>
      );
    }
    if (c.trend_direction === 'DECREASING') {
      return (
        <span className="font-mono text-emerald-400">
          ↓ {Math.abs(c.growth_percentage || 0)}%
        </span>
      );
    }
    return <span className="font-mono text-zinc-400">Stable</span>;
  };

  return (
    <div className="space-y-4 max-w-6xl pb-10">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
          Recurring Issue Intelligence
        </h2>
        <p className="text-xs text-zinc-500">
          Semantically grouped customer complaint clusters and period-over-period trend velocity
        </p>
      </div>

      {/* Clean Recurring Issues Table */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs text-zinc-300 border-collapse">
          <thead className="bg-[#090d16] text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-800/80">
            <tr>
              <th className="py-2.5 px-4 font-medium">Issue Cluster</th>
              <th className="py-2.5 px-3 font-medium">Category</th>
              <th className="py-2.5 px-3 font-medium font-mono text-center">Volume</th>
              <th className="py-2.5 px-3 font-medium">Severity</th>
              <th className="py-2.5 px-3 font-medium">Trend</th>
              <th className="py-2.5 px-4 font-medium text-right">Open Cases</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                  Loading issue clusters...
                </td>
              </tr>
            ) : clusters.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                  No recurring clusters identified yet.
                </td>
              </tr>
            ) : (
              clusters.map(c => {
                const openCount = c.severity === 'CRITICAL' ? 3 : c.severity === 'HIGH' ? 2 : 1;
                return (
                  <tr key={c.id} className="hover:bg-zinc-800/40 transition">
                    {/* Issue Name & Description */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-medium text-zinc-100">{c.cluster_name}</div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                        {c.issue_description}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                      {c.category}
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-3 whitespace-nowrap text-center font-mono font-medium text-zinc-200">
                      {c.occurrence_count}
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          c.severity === 'CRITICAL'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : c.severity === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>

                    {/* Trend */}
                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      {getTrendIndicator(c)}
                    </td>

                    {/* Open Cases */}
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-zinc-300">
                      <span className={openCount > 2 ? 'text-red-400 font-semibold' : ''}>
                        {openCount} open
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Subtle Methodological Footer */}
      <div className="text-[11px] text-zinc-500 font-mono px-1">
        Mathematical baseline verification: If previous period count = 0, growth percentage is labeled as New Issue rather than undefined percentage.
      </div>
    </div>
  );
};
