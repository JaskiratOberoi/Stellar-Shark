import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRunHistory, exportRunHistoryJson } from '../../runHistoryStore.js';
import { BuSummaryTable, GridScanTable } from '../DataTable.jsx';

const PRESET_SHORT = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 days',
    mtd: 'Month to date',
    ytd: 'Year to date'
};

function buRowsFromResult(result) {
    if (!result) return [];
    if (result.multiBu && Array.isArray(result.results)) return result.results;
    if (result.businessUnit) {
        return [
            {
                businessUnit: result.businessUnit,
                labBadge: result.labBadge,
                totalTests: result.totalTests,
                uniqueSids: result.uniqueSids
            }
        ];
    }
    return [];
}

function perStatusRows(result) {
    if (!result || result.multiBu) return [];
    return result.perStatus || [];
}

function sourceLabel(entry) {
    if (entry.source === 'scheduler') return 'Scheduler';
    if (entry.source === 'dashboard') return 'Dashboard';
    return '—';
}

function RunDetailCard({ entry }) {
    const r = entry.result;
    const buRows = useMemo(() => buRowsFromResult(r), [r]);
    const aggregate = useMemo(() => {
        if (!buRows.length) return null;
        return {
            samples: buRows.reduce((s, row) => s + (row.totalTests ?? 0), 0),
            sids: buRows.reduce((s, row) => s + (row.uniqueSids ?? 0), 0)
        };
    }, [buRows]);
    const rangeLabel =
        r.dateFrom && r.dateTo
            ? r.dateFrom === r.dateTo
                ? r.dateFrom
                : `${r.dateFrom} → ${r.dateTo}`
            : r.date != null
              ? String(r.date)
              : '—';
    const testFilter =
        r.testCode != null && String(r.testCode).trim() ? String(r.testCode).trim() : '(all tests)';
    const finished =
        r.completedAt != null
            ? new Date(r.completedAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'medium'
              })
            : '—';

    const downloadOne = () => {
        const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `run-${entry.id?.slice(0, 8) || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <article className="border border-rule-soft bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-rule-soft bg-surface-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-eyebrow uppercase text-ink num">{finished}</span>
                        <span className="font-mono text-eyebrow uppercase px-2 py-0.5 border border-rule-soft text-ink-2">
                            {sourceLabel(entry)}
                        </span>
                        {entry.scheduleLabel ? (
                            <span className="font-mono text-eyebrow uppercase text-ink-3">
                                {entry.scheduleLabel}
                            </span>
                        ) : null}
                    </div>
                    <p className="text-sm text-ink mt-2 font-medium">
                        Worksheet range:{' '}
                        <span className="text-ink-2 font-mono num">{rangeLabel}</span>
                    </p>
                    <p className="text-xs text-ink-3 mt-1">
                        Test filter: <span className="text-ink-2 font-mono">{testFilter}</span>
                        {entry.datePreset ? (
                            <>
                                {' '}
                                <span className="text-ink-3">/</span> Timeframe:{' '}
                                <span className="text-ink-2">
                                    {PRESET_SHORT[entry.datePreset] || entry.datePreset}
                                </span>
                            </>
                        ) : null}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-display font-bold text-3xl text-ink num leading-none">
                        {r.totalTests ?? '—'}
                    </p>
                    <p className="font-mono uppercase text-eyebrow text-ink-3 mt-1">samples</p>
                    <p className="text-xs text-ink-2 mt-2 num">
                        {r.uniqueSids ?? '—'} unique SIDs
                    </p>
                    <button
                        type="button"
                        onClick={downloadOne}
                        className="mt-2 font-mono text-eyebrow uppercase text-ink hover:text-accent transition-colors duration-150 underline-offset-4 underline decoration-1"
                    >
                        Download JSON
                    </button>
                </div>
            </div>
            <div className="px-4 py-4 space-y-4">
                <div>
                    <p className="nexus-eyebrow mb-2">Per business unit</p>
                    <BuSummaryTable rows={buRows} variant="lab" aggregate={aggregate} maxClass="max-h-56 mb-0" />
                </div>
                <details className="group">
                    <summary className="nexus-eyebrow cursor-pointer list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                        <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                        Grid scan / technical
                    </summary>
                    <div className="mt-3">
                        <GridScanTable rows={perStatusRows(r)} maxClass="max-h-40" />
                    </div>
                </details>
            </div>
        </article>
    );
}

export function LabReportsView({ refreshKey = 0 }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const runs = await fetchRunHistory();
            setHistory(Array.isArray(runs) ? runs : []);
        } catch (e) {
            setLoadError(e.message || String(e));
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    const downloadFullHistory = async () => {
        const json = await exportRunHistoryJson();
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `nexus-run-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    if (loading) {
        return (
            <div className="lab-card max-w-2xl">
                <p className="text-sm text-slate-400">Loading reports…</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="lab-card max-w-2xl">
                <h2 className="font-display text-xl font-bold text-ink mb-2">Reports</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Completed runs are saved on the server (and mirrored locally when the API is available). Results
                    from the Dashboard and successful Scheduler jobs appear here automatically.
                </p>
                <p className="text-sm text-slate-500">
                    Run an analysis from the Dashboard or wait for a scheduled job — your first report will show here
                    when it finishes.
                </p>
                {loadError ? (
                    <p className="text-xs text-amber-400/90 mt-3">Could not reach the API: {loadError}</p>
                ) : null}
            </div>
        );
    }

    return (
        <div className="space-y-4 min-h-0 flex flex-col flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">Reports</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Detailed run log: worksheet range, filters, per-lab counts, and technical grid. Data persists in
                        the app data folder (desktop) or <code className="text-sky-500/90">data/</code> (server).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void downloadFullHistory()}
                    className="nexus-btn-ghost"
                >
                    Export history JSON
                </button>
            </div>

            <div className="flex items-center justify-between gap-2 font-mono text-eyebrow uppercase text-ink-3">
                <span>
                    <span className="num text-ink">{history.length}</span> run
                    {history.length === 1 ? '' : 's'} on file
                </span>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="text-ink hover:text-accent transition-colors duration-150"
                >
                    Refresh
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto log-scroll space-y-4 pr-1 pb-4">
                {history.map((entry) => (
                    <RunDetailCard key={entry.id} entry={entry} />
                ))}
            </div>

            <p className="text-[10px] text-slate-600 leading-relaxed max-w-3xl">
                Append-only history. Use &ldquo;Export history JSON&rdquo; for backups. Clearing site data only affects
                the local cache; the server copy remains until you remove the data folder.
            </p>
        </div>
    );
}
