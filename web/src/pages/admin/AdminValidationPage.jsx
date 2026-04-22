import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminValidationPage() {
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [recomputing, setRecomputing] = useState(false);

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

    const upsert = async (row) => {
        const lis = window.prompt('LIS / Teller count (override)', row.shark_count ?? '');
        if (lis === null) return;
        await apiFetch('/api/admin/validation/upsert', {
            method: 'POST',
            body: JSON.stringify({
                date,
                bu_id: row.bu_id,
                machine_id: row.machine_id,
                shark_count: lis === '' ? null : Number(lis),
                lab_tech_count: row.lab_tech_count
            })
        });
        await load();
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
                <table className="data-table data-table-lab w-full min-w-[640px] table-fixed">
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
                            <th className="text-right">Lab kits</th>
                            <th>Status</th>
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
                                    <td className="py-3 text-right tabular-nums">
                                        {r.lab_tech_count ?? '—'}
                                    </td>
                                    <td className="py-3">
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
                                            onClick={() => upsert(r)}
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
        </PageShell>
    );
}
