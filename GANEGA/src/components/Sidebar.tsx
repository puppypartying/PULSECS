import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Layers,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  UploadCloud,
  Settings
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'live-reviews'
  | 'qc-queue'
  | 'clusters'
  | 'research'
  | 'health'
  | 'import'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  openP1Count?: number;
  slaBreachCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  openP1Count = 0,
}) => {
  const [moreOpen, setMoreOpen] = useState(
    ['health', 'import', 'settings'].includes(currentTab)
  );

  const primaryItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live-reviews', label: 'Reviews', icon: MessageSquare },
    {
      id: 'qc-queue',
      label: 'QC Queue',
      icon: CheckSquare,
      badge: openP1Count > 0 ? `${openP1Count}` : undefined,
      badgeColor: 'bg-red-500/10 text-red-400 border border-red-500/20',
    },
    { id: 'clusters', label: 'Issues', icon: Layers },
    { id: 'research', label: 'Research', icon: GraduationCap, tag: 'UTS' },
  ];

  const secondaryItems = [
    { id: 'health', label: 'System Health', icon: HeartPulse },
    { id: 'import', label: 'Data Import', icon: UploadCloud },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isSecondaryActive = ['health', 'import', 'settings'].includes(currentTab);

  return (
    <aside className="w-56 bg-[#0b0f17] border-r border-zinc-800/80 flex flex-col shrink-0 select-none">
      {/* Primary Navigation */}
      <nav className="p-3 space-y-0.5 flex-1">
        <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          Workspace
        </div>

        {primaryItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as TabType)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-zinc-800/90 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}

              {item.tag && (
                <span className="text-[10px] font-mono text-zinc-500">
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="pt-4 pb-1">
          <div className="border-t border-zinc-800/60" />
        </div>

        {/* Secondary Navigation under "More" */}
        <div>
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              isSecondaryActive ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider font-medium">System</span>
            {moreOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {moreOpen && (
            <div className="mt-0.5 space-y-0.5 pl-1">
              {secondaryItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as TabType)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800/90 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-800/80 text-[11px] text-zinc-500">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-zinc-400">UNPAD FEB</span>
          <span className="text-[10px] text-zinc-600">v1.2</span>
        </div>
      </div>
    </aside>
  );
};
