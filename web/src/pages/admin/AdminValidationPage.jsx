import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, X } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminValidationPage() {
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [recomputing, setRecomputing] = useState(false);
    const [overrideRow, setOverrideRow] = useState(null);
    const [overrideValue, setOverrideValue] = useState('');
    const [overrideSaving, setOverrideSaving] = useState(false);
    const [overrideError, setOverrideError] = useState(null);

    const load = useCallback(async () => {
        const res = await apiFetch(
            `/api/admin/validation?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`
        );
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setRows(d.rows || []);
    }, [date]);

    useEffect(() => {
        load().catch((e) => setError(e.message));
    }, [load]);

    useEffect(() => {
        const id = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            load().catch(() => {});
        }, 12000);
        return () => window.clearInterval(id);
    }, [load]);

    const recompute = async () => {
        setError(null);
        setRecomputing(true);
        try {
            const res = await apiFetch('/api/admin/validation/recompute-lab', {
                method: 'POST',
                body: JSON.stringify({ date })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Recompute failed');
            await load();
        } catch (e) {
            setError(e.message);
        } finally {
            setRecomputing(false);
        }
    };

    const openOverride = (row) => {
        setOverrideError(null);
        setOverrideRow(row);
        setOverrideValue(row.shark_count == null ? '' : String(row.shark_count));
    };

    const closeOverride = () => {
        if (overrideSaving) return;
        setOverrideRow(null);
        setOverrideError(null);
    };

    const saveOverride = async (e) => {
        e.preventDefault();
        if (!overrideRow) return;
        setOverrideError(null);
        setOverrideSaving(true);
        try {
            const res = await apiFetch('/api/admin/validation/upsert', {
                method: 'POST',
                body: JSON.stringify({
                    date,
                    bu_id: overrideRow.bu_id,
                    machine_id: overrideRow.machine_id,
                    shark_count: overrideValue.trim() === '' ? null : Number(overrideValue),
                    lab_tech_count: overrideRow.lab_tech_count
                })
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Update failed');
            setOverrideRow(null);
            await load();
        } catch (err) {
            setOverrideError(err.message || String(err));
        } finally {
            setOverrideSaving(false);
        }
    };

    return (
        <PageShell
            badge="Admin · Quality"
            badgeIcon={ClipboardCheck}
            title="Daily validation"
            description="LIS totals from Teller runs (single-day) sync into this table automatically when a run is saved. Lab kit totals update when technicians save lab entry — or use Recompute. The same BU-level LIS count is shown on each machine row for that day."
            error={error}
        >
            <div className="lab-card p-4 md:p-5 shadow-card flex flex-wrap items-end gap-3">
                <div>
                    <label
                        className="block text-xs font-medium text-ink-2 mb-1.5"
                        htmlFor="val-date"
                    >
                        Date
                    </label>
                    <input
                        id="val-date"
                        type="date"
                        className="lab-input"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    disabled={recomputing}
                    className="btn-ghost text-sm disabled:opacity-50"
                    onClick={recompute}
                >
                    {recomputing ? 'Recomputing…' : 'Recompute lab totals'}
                </button>
            </div>

            <DataTableShell title="Validation rows" count={rows.length}>
                <table className="data-table data-table-lab w-full min-w-0 table-fixed">
                    <colgroup>
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="pl-5">BU</th>
                            <th>Machine</th>
                            <th className="text-right">LIS (Teller)</th>
                            <th className="hidden text-right md:table-cell">Lab kits</th>
                            <th className="hidden md:table-cell">Status</th>
                            <th className="pr-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No rows for this date. Run a single-day Teller counter (saved to history) to
                                    populate LIS counts, or save lab entry — then use Recompute if needed.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-3 text-ink truncate">{r.bu_name}</td>
                                    <td className="py-3 text-ink-2 truncate">{r.machine_name}</td>
                                    <td className="py-3 text-right tabular-nums">
                                        {r.shark_count ?? '—'}
                                    </td>
                                    <td className="hidden py-3 text-right tabular-nums md:table-cell">
                                        {r.lab_tech_count ?? '—'}
                                    </td>
                                    <td className="hidden py-3 md:table-cell">
                                        <span
                                            className={
                                                r.match_status === 'match'
                                                    ? 'text-success font-medium'
                                                    : r.match_status === 'mismatch'
                                                      ? 'text-danger font-medium'
                                                      : 'text-ink-3'
                                            }
                                        >
                                            {r.match_status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="pr-5 py-3 text-right">
                                        <button
                                            type="button"
                                            className="text-xs font-medium text-accent hover:underline"
                                            onClick={() => openOverride(r)}
                                        >
                                            Override LIS
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </DataTableShell>

            {overrideRow ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="lis-override-title"
                    onClick={closeOverride}
                >
                    <div
                        className="w-full max-w-md border border-rule-soft bg-surface shadow-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between border-b border-rule-soft px-5 py-3 bg-surface-2">
                            <h2 id="lis-override-title" className="text-sm font-semibold text-ink">
                                LIS / Teller count
                            </h2>
                            <button
                                type="button"
                                onClick={closeOverride}
                                aria-label="Close"
                                className="p-1.5 text-ink-3 hover:text-ink"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </header>
                        <form onSubmit={saveOverride} className="p-5 space-y-4">
                            <p className="text-xs text-ink-2">
                                {overrideRow.bu_name} · {overrideRow.machine_name}
                            </p>
                            {overrideError ? (
                                <p className="text-xs text-danger border border-danger/30 bg-danger-soft px-2 py-1.5">
                                    {overrideError}
                                </p>
                            ) : null}
                            <div>
                                <label className="block text-xs font-medium text-ink-2 mb-1.5" htmlFor="lis-override-n">
                                    Count (empty to clear)
                                </label>
                                <input
                                    id="lis-override-n"
                                    type="number"
                                    min={0}
                                    className="lab-input w-full tabular-nums"
                                    value={overrideValue}
                                    onChange={(e) => setOverrideValue(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeOverride}
                                    className="px-4 py-2 text-sm font-medium text-ink-secondary border border-border hover:bg-surface-muted rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={overrideSaving}
                                    className="btn-primary py-2 px-5 text-sm disabled:opacity-60"
                                >
                                    {overrideSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </PageShell>
    );
}
