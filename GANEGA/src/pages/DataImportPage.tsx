import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface DataImportPageProps {
  onImportComplete?: () => void;
}

export const DataImportPage: React.FC<DataImportPageProps> = ({ onImportComplete }) => {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleCsvTemplate = `Review ID,Star Rating,Review Text,Reviewer Name,App Version Name
gp-exp-101,1,"Kode OTP perpanjangan SIM tidak masuk ke nomor Telkomsel saya","Budi Hartono",1.4.3
gp-exp-102,1,"Aplikasi crash dan keluar sendiri saat klik menu ETLE","Siti Aminah",1.4.3
gp-exp-103,2,"Loading sangat lama pas mau bayar denda tilang via BRIVA","Rudi Hermawan",1.4.2
gp-exp-104,5,"Pelayanan SKCK online sangat cepat dan efisien. Luar biasa Polri!","Dewi Lestari",1.4.3`;

  const handleImport = async () => {
    if (!csvText.trim()) {
      setErrorMsg('Please paste or upload a CSV before importing.');
      return;
    }
    setImporting(true);
    setErrorMsg(null);
    setSummary(null);

    try {
      const res = await fetch('/api/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csvText,
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data);
        if (onImportComplete) onImportComplete();
      } else {
        setErrorMsg(data.error || 'Import failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during import');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
          Google Play Reviews CSV Import
        </h2>
        <p className="text-xs text-zinc-500">
          Import official Google Play Console review export files. Records are tagged as HISTORICAL_GOOGLE_PLAY_EXPORT.
        </p>
      </div>

      {summary && (
        <div className="bg-[#0f141f] border border-emerald-500/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>CSV Import Completed</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs pt-1 font-mono">
            <div className="bg-[#090d16] p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[11px] block">Detected</span>
              <span className="text-zinc-200 font-semibold">{summary.rowsDetected}</span>
            </div>
            <div className="bg-[#090d16] p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[11px] block">Imported & Triaged</span>
              <span className="text-emerald-400 font-semibold">+{summary.rowsImported}</span>
            </div>
            <div className="bg-[#090d16] p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[11px] block">Duplicates Skipped</span>
              <span className="text-zinc-400 font-semibold">{summary.rowsSkipped}</span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            Paste CSV or upload export file
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCsvText(sampleCsvTemplate)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition cursor-pointer"
            >
              Load Sample Template
            </button>
            <label className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition cursor-pointer border border-zinc-700/60">
              Browse CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <textarea
          rows={8}
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={`Review ID,Star Rating,Review Text,Reviewer Name,App Version Name\ngp-101,1,"Aplikasi force close","Budi",1.4.3`}
          className="w-full bg-[#090d16] border border-zinc-800 rounded p-2.5 font-mono text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-500 font-mono">
            {csvText ? `${csvText.trim().split('\n').length - 1} rows ready` : 'No data pasted'}
          </span>

          <button
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 border border-zinc-700/60 rounded text-xs font-medium transition cursor-pointer"
          >
            {importing ? 'Processing...' : 'Import & Triage Reviews'}
          </button>
        </div>
      </div>
    </div>
  );
};
