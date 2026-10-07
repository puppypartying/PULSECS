import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { SystemHealth } from '../types';

interface HeaderProps {
  health: SystemHealth | null;
  onRefresh: () => void;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ health, onRefresh, onSyncNow, isSyncing }) => {
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncClick = async () => {
    try {
      await onSyncNow();
      setSyncFeedback('Synced');
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch {
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  const isPlayConnected = health?.diagnostics?.packageAccess?.status === 'PASS';
  const lastSyncStr = health?.metrics?.lastSync
    ? new Date(health.metrics.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '17:47';

  return (
    <header className="bg-[#0b0f17] border-b border-zinc-800/80 px-6 py-3.5 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Product Name & Restrained Subtitle */}
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100 text-sm tracking-tight">PulseQC</span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              {health?.appName || 'Super App Polri'}
            </span>
          </div>
          <span className="hidden md:inline text-xs text-zinc-500">
            Near Real-Time Customer Feedback Quality Control
          </span>
        </div>

        {/* Right: Clean Operational Status & Sync Action */}
        <div className="flex items-center gap-4 text-xs">
          {/* Subtle Google Play Connection status */}
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlayConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-zinc-500">Google Play:</span>
            <span className={isPlayConnected ? 'text-zinc-300 font-medium' : 'text-amber-400/90 font-medium'}>
              {isPlayConnected ? 'Connected' : 'Authorization Required'}
            </span>
          </div>

          {/* Last Sync */}
          <div className="hidden sm:flex items-center gap-1 text-zinc-500">
            <span>Last sync:</span>
            <span className="text-zinc-400 font-mono text-[11px]">{lastSyncStr}</span>
          </div>

          {/* Sync Feedback Message */}
          {syncFeedback && (
            <span className="text-[11px] font-medium text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {syncFeedback}
            </span>
          )}

          {/* Clean B2B Sync Button */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/70 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
