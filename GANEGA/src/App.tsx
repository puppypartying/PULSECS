import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveReviewsPage } from './pages/LiveReviewsPage';
import { QCQueuePage } from './pages/QCQueuePage';
import { IssueIntelligencePage } from './pages/IssueIntelligencePage';
import { ResearchEvaluationPage } from './pages/ResearchEvaluationPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { DataImportPage } from './pages/DataImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewModal } from './components/ReviewModal';
import { SystemHealth } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [openP1Count, setOpenP1Count] = useState(0);
  const [slaBreachCount, setSlaBreachCount] = useState(0);

  const fetchHealthAndCounts = () => {
    fetch('/api/health')
      .then(res => res.json())
      .then(d => setHealth(d))
      .catch(err => console.error('Error fetching health:', err));

    fetch('/api/summary')
      .then(res => res.json())
      .then(d => {
        if (d) {
          setOpenP1Count(d.p1Open || 0);
        }
      })
      .catch(() => {});

    fetch('/api/bottlenecks')
      .then(res => res.json())
      .then(d => {
        if (d) {
          setSlaBreachCount((d.slaBreachesP1 || 0) + (d.slaBreachesP2 || 0));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchHealthAndCounts();
    // Near real-time background refresh every 30 seconds
    const interval = setInterval(fetchHealthAndCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      fetchHealthAndCounts();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/20">
      {/* Top Header */}
      <Header
        health={health}
        onRefresh={fetchHealthAndCounts}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Streamlined Quiet Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          openP1Count={openP1Count}
          slaBreachCount={slaBreachCount}
        />

        {/* Workspace Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8 bg-[#080c14]">
          <div className="max-w-6xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewPage
                onSelectReview={id => setSelectedReviewId(id)}
                onNavigateToTab={tab => setCurrentTab(tab)}
              />
            )}
            {currentTab === 'live-reviews' && (
              <LiveReviewsPage onSelectReview={id => setSelectedReviewId(id)} />
            )}
            {currentTab === 'qc-queue' && (
              <QCQueuePage
                onSelectReview={id => setSelectedReviewId(id)}
                onRefreshStats={fetchHealthAndCounts}
              />
            )}
            {currentTab === 'clusters' && <IssueIntelligencePage />}
            {currentTab === 'research' && <ResearchEvaluationPage />}
            {currentTab === 'health' && <SystemHealthPage />}
            {currentTab === 'import' && (
              <DataImportPage onImportComplete={fetchHealthAndCounts} />
            )}
            {currentTab === 'settings' && (
              <SettingsPage onConfigSaved={fetchHealthAndCounts} />
            )}
          </div>
        </main>
      </div>

      {/* Review Inspection Modal */}
      {selectedReviewId && (
        <ReviewModal
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
          onStatusUpdated={fetchHealthAndCounts}
        />
      )}
    </div>
  );
}

export default App;
