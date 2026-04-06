import { useMemo } from 'react';
import { loadRunHistory, exportRunHistoryJson } from '../../runHistoryStore.js';
import { buildReportMatrix } from '../../reportMatrix.js';

export function LabReportsView({ refreshKey = 0 }) {
    const history = useMemo(() => {
        void refreshKey;
        return loadRunHistory();
    }, [refreshKey]);
    const matrix = useMemo(() => buildReportMatrix(history), [history]);

    const downloadFullHistory = () => {
        const blob = new Blob([exportRunHistoryJson()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `labintel-run-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    if (history.length === 0) {
        return (
            <div className="lab-card max-w-2xl">
                <h2 className="font-display text-xl font-bold text-white mb-2">Reports</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Every completed analysis is appended here as a new column. History is kept permanently in this
                    browser and is never deleted by the app.
                </p>
                <p className="text-sm text-slate-500">
                    Run an analysis from the Dashboard — your first column will appear after it finishes.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 min-h-0 flex flex-col flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-white">Reports</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Each column is one completed run: worksheet date range, LIS test-code filter, per-lab counts,
                        totals, and SID capture size. Records are append-only and persist in localStorage.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={downloadFullHistory}
                    className="shrink-0 px-4 py-2 rounded-lg border border-white/15 text-xs font-semibold uppercase tracking-wider text-sky-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                >
                    Export history JSON
                </button>
            </div>

            <div className="lab-card flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {history.length} run{history.length === 1 ? '' : 's'} on file
                    </span>
                    <span className="text-[10px] text-slate-600">Scroll horizontally to see all runs</span>
                </div>
                <div className="flex-1 min-h-0 overflow-auto log-scroll">
                    <table className="text-xs border-collapse min-w-max w-full">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 bg-[#111827] border-b border-r border-white/10 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 min-w-[11rem] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                    Metric
                                </th>
                                {matrix.columns.map((col) => (
                                    <th
                                        key={col.id}
                                        className="border-b border-white/10 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-sky-400/90 min-w-[7.5rem] bg-[#0f172a]/95"
                                    >
                                        {col.shortLabel}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {matrix.rowDefs.map((row) => (
                                <tr key={row.key} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                                    <th
                                        scope="row"
                                        className="sticky left-0 z-10 bg-[#111827] border-r border-white/10 px-3 py-2 text-left font-medium text-slate-400 whitespace-nowrap shadow-[4px_0_12px_-4px_rgba(0,0,0,0.45)]"
                                    >
                                        {row.label}
                                    </th>
                                    {matrix.columns.map((col) => (
                                        <td
                                            key={`${col.id}-${row.key}`}
                                            className="px-3 py-2 text-center tabular-nums max-w-[14rem] truncate border-l border-white/[0.04]"
                                            title={col.values[row.key] ?? '—'}
                                        >
                                            {col.values[row.key] ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-[10px] text-slate-600 leading-relaxed max-w-3xl">
                Full payload per run (including SID lists when present) is stored locally. Clearing browser site data
                will remove this history — use &ldquo;Export history JSON&rdquo; for a backup. The application does not
                provide a delete action.
            </p>
        </div>
    );
}
