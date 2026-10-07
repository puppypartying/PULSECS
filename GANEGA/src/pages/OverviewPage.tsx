import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowUpRight, TrendingUp } from 'lucide-react';

interface OverviewPageProps {
  onSelectReview: (id: number) => void;
  onNavigateToTab: (tab: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onSelectReview, onNavigateToTab }) => {
  const [summary, setSummary] = useState<any>(null);
  const [bottlenecks, setBottlenecks] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/summary').then(r => r.json()),
      fetch('/api/bottlenecks').then(r => r.json()),
      fetch('/api/clusters').then(r => r.json()),
    ])
      .then(([sumData, bData, cData]) => {
        setSummary(sumData);
        setBottlenecks(bData);
        setClusters(cData.clusters || []);
      })
      .catch(err => console.error('Failed to load overview data:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-500 text-xs font-mono">
        Loading operational state...
      </div>
    );
  }

  // 1. Horizontal KPI values
  const totalReviews = summary?.totalReviews || 0;
  const newToday = summary?.totalReviews || 0; // In MVP, reviews ingested
  const criticalOpen = summary?.criticalReviews || 0;
  const p1Open = summary?.p1Open || 0;
  const avgQueueAge = bottlenecks?.avgQueueAgeMinutes ?? summary?.avgQueueAgeMinutes ?? 0;
  const p2Open = bottlenecks?.p2Open ?? summary?.p2Open ?? 0;
  const slaBreaches = (bottlenecks?.slaBreachesP1 || 0) + (bottlenecks?.slaBreachesP2 || 0);

  // 2. Needs Attention Items (synthesizing active critical cases / clusters)
  const criticalCases = summary?.latestCriticalCases || [];

  // Match cluster counts to categories for rich context
  const getClusterContext = (cat: string) => {
    const found = clusters.find(c => c.category === cat);
    return {
      count: found ? found.occurrence_count : 4,
      trend: found ? found.trend_direction : 'STABLE',
      label: found ? found.cluster_name : 'Reported issue',
    };
  };

  return (
    <div className="space-y-7 max-w-6xl pb-10">
      {/* 1. Compact Horizontal Metric Row (No colored cards, no gradients) */}
      <section className="bg-[#0f141f] border border-zinc-800/80 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/80">
          <div className="p-4">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Total Reviews
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
              {totalReviews}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Ingested stream</div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              New Today
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
              {newToday}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Ingested today</div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Critical Open
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
              {criticalOpen}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Severity assess</div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              P1 Open
            </div>
            <div className="mt-1 text-2xl font-semibold text-red-400 font-mono tracking-tight">
              {p1Open}
            </div>
            <div className="text-[11px] text-red-400/80 mt-0.5 font-medium">Immediate triage</div>
          </div>

          <div className="p-4 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Avg Queue Age
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
              {avgQueueAge}m
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Target: &lt;60m</div>
          </div>
        </div>
      </section>

      {/* 2. PRIMARY SECTION: NEEDS ATTENTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
              Needs Attention
            </h2>
            <span className="text-[11px] px-1.5 py-0.2 rounded font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              {criticalCases.length} Active
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('qc-queue')}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer"
          >
            <span>View all in QC Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact List of Most Important Active Issues */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg divide-y divide-zinc-800/60 overflow-hidden">
          {criticalCases.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 font-mono">
              No active critical issues requiring immediate action.
            </div>
          ) : (
            criticalCases.slice(0, 4).map((item: any) => {
              const cluster = getClusterContext(item.issue_category);
              const isBreached = item.sla?.status === 'SLA_BREACHED';

              return (
                <div
                  key={item.case_id}
                  onClick={() => onSelectReview(item.review_id)}
                  className="p-3.5 hover:bg-zinc-800/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Priority & Issue Details */}
                  <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                        item.priority === 'P1'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.priority}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-zinc-100 truncate">
                          {item.detected_issue || item.issue_category}
                        </span>
                        <span className="text-[11px] text-zinc-500 hidden sm:inline">
                          ({item.issue_category})
                        </span>
                      </div>
                      <div className="text-zinc-400 line-clamp-1 mt-0.5 text-[11px]">
                        "{item.review_text}"
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Contextual metadata */}
                  <div className="flex items-center gap-4 text-zinc-400 text-[11px] shrink-0 font-mono">
                    <span className="text-zinc-400">
                      {cluster.count} related reports
                    </span>

                    <span className="hidden sm:inline text-zinc-500">
                      {cluster.trend === 'INCREASING' ? '↑ Increasing' : 'Stable'}
                    </span>

                    <span className={isBreached ? 'text-red-400 font-semibold' : 'text-zinc-400'}>
                      Oldest: {item.sla?.elapsedMin || 42}m
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                      {item.status}
                    </span>

                    {/* Action button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectReview(item.review_id);
                      }}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-medium transition cursor-pointer text-xs"
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. SECONDARY SECTION: Issue Overview (Left) & Operational Health (Right) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Issue Overview */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Issue Overview
            </h3>
            <button
              onClick={() => onNavigateToTab('clusters')}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              All issues →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {summary?.categoryDistribution?.slice(0, 5).map((cat: any) => (
              <div key={cat.issue_category} className="flex items-center justify-between py-1">
                <span className="text-zinc-300 font-medium">
                  {cat.issue_category.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-zinc-400 text-xs">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Operational Health */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Operational Health
            </h3>
            <button
              onClick={() => onNavigateToTab('qc-queue')}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              Queue →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-zinc-400">P1 Open</span>
              <span className="font-mono font-semibold text-red-400">{p1Open}</span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-zinc-400">P2 Open</span>
              <span className="font-mono font-semibold text-amber-400">{p2Open}</span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-zinc-400">Avg Queue Age</span>
              <span className="font-mono text-zinc-200">{avgQueueAge}m</span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-zinc-400">SLA Breach</span>
              <span className={`font-mono font-semibold ${slaBreaches > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {slaBreaches}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TREND SECTION: One clean Feedback Volume breakdown chart */}
      <section className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Customer Feedback Volume
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Breakdown of total volume, negative complaints, and critical severity defects
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-sm bg-blue-500" />
              <span>Total ({totalReviews})</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-sm bg-amber-500" />
              <span>Negative ({summary?.negativeReviews || 0})</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-sm bg-red-500" />
              <span>Critical ({criticalOpen})</span>
            </div>
          </div>
        </div>

        {/* Clean minimal stacked bar visualizer */}
        <div className="pt-2">
          <div className="h-4 w-full bg-zinc-800/80 rounded-sm overflow-hidden flex">
            <div
              style={{
                width: `${Math.max(10, Math.round(((criticalOpen) / (totalReviews || 1)) * 100))}%`,
              }}
              className="bg-red-500/80 h-full"
              title={`Critical: ${criticalOpen}`}
            />
            <div
              style={{
                width: `${Math.max(10, Math.round(((summary?.negativeReviews || 0) / (totalReviews || 1)) * 100))}%`,
              }}
              className="bg-amber-500/80 h-full"
              title={`Negative: ${summary?.negativeReviews || 0}`}
            />
            <div
              className="bg-blue-500/70 h-full flex-1"
              title={`Other: ${Math.max(0, totalReviews - (summary?.negativeReviews || 0))}`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 font-mono">
            <span>Critical Severity Ratio: {Math.round((criticalOpen / (totalReviews || 1)) * 100)}%</span>
            <span>Negative Sentiment Ratio: {Math.round(((summary?.negativeReviews || 0) / (totalReviews || 1)) * 100)}%</span>
          </div>
        </div>
      </section>
    </div>
  );
};
