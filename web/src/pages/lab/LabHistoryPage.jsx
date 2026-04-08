import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function LabHistoryPage() {
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d.toISOString().slice(0, 10);
    });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [entries, setEntries] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch(
                    `/api/lab/entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
                );
                const d = await res.json();
                if (!res.ok) throw new Error(d.error);
                setEntries(d.entries || []);
            } catch (e) {
                setError(e.message);
            }
        })();
    }, [from, to]);

    return (
        <PageShell
            badge="Lab"
            badgeIcon={History}
            title="Entry history"
            description="Review parameter entries and kit usage for your business unit within a date range."
            error={error}
            maxWidthClass="max-w-5xl"
        >
            <div className="lab-card p-4 md:p-5 shadow-card flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="hist-from">
                        From
                    </label>
                    <input
                        id="hist-from"
                        type="date"
                        className="lab-input"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="hist-to">
                        To
                    </label>
                    <input
                        id="hist-to"
                        type="date"
                        className="lab-input"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>
            </div>

            <DataTableShell title="Entries" count={entries.length}>
                <table className="data-table data-table-lab text-xs w-full min-w-[640px]">
                    <thead>
                        <tr>
                            <th className="pl-5">Date</th>
                            <th>BU</th>
                            <th>Machine</th>
                            <th>Parameter</th>
                            <th>Value</th>
                            <th className="pr-5">Kits</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No entries in this range.
                                </td>
                            </tr>
                        ) : (
                            entries.map((e) => (
                                <tr key={e.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-2.5 whitespace-nowrap">{e.date}</td>
                                    <td className="py-2.5">{e.bu_name}</td>
                                    <td className="py-2.5">{e.machine_name}</td>
                                    <td className="py-2.5">{e.parameter_name || '—'}</td>
                                    <td className="py-2.5 tabular-nums">{e.value ?? '—'}</td>
                                    <td className="pr-5 py-2.5 tabular-nums">{e.kits_used}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </DataTableShell>
        </PageShell>
    );
}
