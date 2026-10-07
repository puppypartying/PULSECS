import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { AppConfig } from '../types';

interface SettingsPageProps {
  onConfigSaved?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Form states
  const [appName, setAppName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [pollingInterval, setPollingInterval] = useState(300);
  const [p1Threshold, setP1Threshold] = useState(80);
  const [p2Threshold, setP2Threshold] = useState(60);
  const [p3Threshold, setP3Threshold] = useState(30);
  const [slaP1, setSlaP1] = useState(60);
  const [slaP2, setSlaP2] = useState(240);
  const [slaP3, setSlaP3] = useState(1440);
  const [maskAuthors, setMaskAuthors] = useState(true);
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => {
        setConfig(d);
        setAppName(d.appName);
        setPackageName(d.packageName);
        setPollingInterval(d.pollingInterval);
        setP1Threshold(d.priorityThresholds.p1);
        setP2Threshold(d.priorityThresholds.p2);
        setP3Threshold(d.priorityThresholds.p3);
        setSlaP1(d.slaThresholds.p1Minutes);
        setSlaP2(d.slaThresholds.p2Minutes);
        setSlaP3(d.slaThresholds.p3Minutes);
        setMaskAuthors(d.privacyMaskAuthors);
        setGeminiModel(d.geminiModel);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          packageName,
          pollingInterval: Number(pollingInterval),
          priorityThresholds: {
            p1: Number(p1Threshold),
            p2: Number(p2Threshold),
            p3: Number(p3Threshold),
          },
          slaThresholds: {
            p1Minutes: Number(slaP1),
            p2Minutes: Number(slaP2),
            p3Minutes: Number(slaP3),
          },
          privacyMaskAuthors: maskAuthors,
          geminiModel,
        }),
      });
      if (res.ok) {
        setSaveMsg('Configuration saved.');
        setTimeout(() => setSaveMsg(null), 2500);
        if (onConfigSaved) onConfigSaved();
      }
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-zinc-500 text-xs font-mono">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
          Settings & Configuration
        </h2>
        <p className="text-xs text-zinc-500">
          Target package, polling intervals, priority score tiers, and SLA thresholds
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Monitored App */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Target Application
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Android Package Name</label>
              <input
                type="text"
                value={packageName}
                onChange={e => setPackageName(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Polling & Triage Configuration */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Polling & Model Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Polling Interval (Seconds)</label>
              <input
                type="number"
                min="30"
                value={pollingInterval}
                onChange={e => setPollingInterval(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Gemini Model</label>
              <input
                type="text"
                value={geminiModel}
                onChange={e => setGeminiModel(e.target.value)}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Priority Engine Thresholds */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Priority Engine Minimum Thresholds (0–100)
          </h3>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-red-400 mb-1">P1 Minimum</label>
              <input
                type="number"
                value={p1Threshold}
                onChange={e => setP1Threshold(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-amber-400 mb-1">P2 Minimum</label>
              <input
                type="number"
                value={p2Threshold}
                onChange={e => setP2Threshold(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">P3 Minimum</label>
              <input
                type="number"
                value={p3Threshold}
                onChange={e => setP3Threshold(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* Operational SLA Targets */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Operational SLA Targets (Minutes)
          </h3>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-zinc-400 mb-1">P1 SLA (min)</label>
              <input
                type="number"
                value={slaP1}
                onChange={e => setSlaP1(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">P2 SLA (min)</label>
              <input
                type="number"
                value={slaP2}
                onChange={e => setSlaP2(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">P3 SLA (min)</label>
              <input
                type="number"
                value={slaP3}
                onChange={e => setSlaP3(Number(e.target.value))}
                className="w-full bg-[#090d16] border border-zinc-800 rounded p-2 text-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-medium text-zinc-200 block">Pseudonymize Reviewer Author Names</span>
            <span className="text-zinc-500 text-[11px]">Mask author names across views (e.g., "Budi Santoso" &rarr; "B*** S***")</span>
          </div>
          <input
            type="checkbox"
            checked={maskAuthors}
            onChange={e => setMaskAuthors(e.target.checked)}
            className="w-4 h-4 accent-zinc-500 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-emerald-400 font-mono">{saveMsg}</span>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 border border-zinc-700/60 rounded text-xs font-medium transition cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
