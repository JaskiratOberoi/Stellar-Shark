import { useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { TestCodeQuickPicks } from '../../components/lab/TestCodeQuickPicks.jsx';

function isoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function offsetIso(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return isoLocal(d);
}

const RANGE_PRESETS = [
    { id: 'today', label: 'TODAY', from: 0, to: 0 },
    { id: 'yesterday', label: 'YESTERDAY', from: -1, to: -1 },
    { id: 'last7', label: 'LAST 7D', from: -6, to: 0 },
    { id: 'last30', label: 'LAST 30D', from: -29, to: 0 }
];

const KIND_BADGES = {
    parameter: { text: 'PARAM', className: 'border-rule-soft text-ink-3' },
    kits: { text: 'SAMPLES', className: 'border-rule-soft text-ink-2' },
    qc: { text: 'QC/CAL', className: 'border-accent text-ink bg-accent/10' },
    calibration: { text: 'QC/CAL', className: 'border-accent text-ink bg-accent/10' },
    repeat: { text: 'REPEAT', className: 'border-accent text-ink bg-accent/10' }
};

function KindBadge({ kind }) {
    const badge = KIND_BADGES[kind] || KIND_BADGES.parameter;
    return (
        <span
            className={`inline-flex items-center px-1.5 py-0.5 border font-mono uppercase text-[10px] tracking-wider ${badge.className}`}
        >
            {badge.text}
        </span>
    );
}

export function LabHistoryPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';
    const [from, setFrom] = useState(() => offsetIso(-14));
    const [to, setTo] = useState(() => offsetIso(0));
    const [entries, setEntries] = useState([]);
    const [error, setError] = useState(null);
    const [filterTestCode, setFilterTestCode] = useState('');
    const [filterSid, setFilterSid] = useState('');

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

    const filtered = useMemo(() => {
        const code = filterTestCode.trim().toUpperCase();
        const sid = filterSid.trim().toUpperCase();
        if (!code && !sid) return entries;
        return entries.filter((e) => {
            if (code && (e.test_code || '').toUpperCase() !== code) return false;
            // Substring match -- techs may scan a partial SID. Non-repeat rows
            // have sid=null so they naturally drop out when this filter is set.
            if (sid && !(e.sid || '').toUpperCase().includes(sid)) return false;
            return true;
        });
    }, [entries, filterTestCode, filterSid]);

    const activeRangeId = useMemo(() => {
        for (const p of RANGE_PRESETS) {
            if (offsetIso(p.from) === from && offsetIso(p.to) === to) return p.id;
        }
        return null;
    }, [from, to]);

    return (
        <PageShell
            badge={isSuperAdmin ? 'Audit' : 'Lab'}
            badgeIcon={History}
            title="Entry history"
            description={
                isSuperAdmin
                    ? 'Audit trail of every lab submission across all business units, including who submitted each row.'
                    : 'Review parameter entries and kit usage for your business unit within a date range.'
            }
            error={error}
            maxWidthClass="max-w-5xl"
        >
            <div className="lab-card p-4 md:p-5 shadow-card space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label
                            className="block text-xs font-medium text-ink-2 mb-1.5"
                            htmlFor="hist-from"
                        >
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
                        <label
                            className="block text-xs font-medium text-ink-2 mb-1.5"
                            htmlFor="hist-to"
                        >
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
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range quick picks">
                        {RANGE_PRESETS.map((p) => {
                            const active = activeRangeId === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        setFrom(offsetIso(p.from));
                                        setTo(offsetIso(p.to));
                                    }}
                                    className={`px-2.5 py-1.5 border font-mono uppercase text-eyebrow transition-colors duration-150 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                        active
                                            ? 'border-accent bg-accent/10 text-ink ring-1 ring-accent/40'
                                            : 'border-rule-soft text-ink-2 hover:border-ink hover:text-ink'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label
                            className="block text-xs font-medium text-ink-2 mb-1.5"
                            htmlFor="hist-testcode"
                        >
                            Filter by test code{' '}
                            <span className="text-ink-3 font-normal">(optional)</span>
                        </label>
                        <input
                            id="hist-testcode"
                            type="text"
                            maxLength={16}
                            autoComplete="off"
                            spellCheck={false}
                            className="lab-input w-full font-mono uppercase tracking-wider"
                            placeholder="e.g. BI221"
                            value={filterTestCode}
                            onChange={(e) => setFilterTestCode(e.target.value)}
                            onBlur={(e) =>
                                setFilterTestCode(e.target.value.trim().toUpperCase().slice(0, 16))
                            }
                        />
                        <div className="mt-2">
                            <TestCodeQuickPicks
                                value={filterTestCode}
                                onChange={setFilterTestCode}
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            className="block text-xs font-medium text-ink-2 mb-1.5"
                            htmlFor="hist-sid"
                        >
                            Filter by SID{' '}
                            <span className="text-ink-3 font-normal">(optional)</span>
                        </label>
                        <input
                            id="hist-sid"
                            type="text"
                            maxLength={64}
                            autoComplete="off"
                            spellCheck={false}
                            className="lab-input w-full font-mono uppercase tracking-wider"
                            placeholder="e.g. S0001234"
                            value={filterSid}
                            onChange={(e) => setFilterSid(e.target.value)}
                            onBlur={(e) =>
                                setFilterSid(e.target.value.trim().toUpperCase().slice(0, 64))
                            }
                        />
                        <p className="mt-2 text-xs text-ink-3">
                            Substring match. Limits results to repeat rows for that sample.
                        </p>
                    </div>
                </div>
            </div>

            <DataTableShell title="Entries" count={filtered.length}>
                <table className="data-table data-table-lab text-xs w-full min-w-[760px]">
                    <thead>
                        <tr>
                            <th className="pl-5">Date</th>
                            <th>BU</th>
                            <th>Machine</th>
                            <th>Parameter</th>
                            <th>Type</th>
                            <th>Test code</th>
                            <th>Value</th>
                            <th>Kits</th>
                            <th className="pr-5">Submitted by</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-5 py-14 text-center text-sm text-ink-muted"
                                >
                                    No entries match the current filters.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((e) => {
                                const kind = e.entry_kind || 'parameter';
                                const isParam = kind === 'parameter';
                                const isRepeat = kind === 'repeat';
                                const submitterName =
                                    e.entered_by_display_name ||
                                    e.entered_by_username ||
                                    (e.entered_by ? '—' : 'system');
                                const submitterUsername =
                                    e.entered_by_username && e.entered_by_display_name
                                        ? e.entered_by_username
                                        : null;
                                let parameterCell;
                                if (isRepeat) {
                                    parameterCell = (
                                        <span
                                            className="text-ink-2"
                                            title={e.repeat_reason || ''}
                                        >
                                            {e.repeat_reason || '—'}
                                        </span>
                                    );
                                } else if (isParam) {
                                    parameterCell = e.parameter_name || '—';
                                } else {
                                    parameterCell = '—';
                                }
                                let valueCell;
                                if (isRepeat) {
                                    valueCell = (
                                        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
                                            {e.sid || '—'}
                                        </span>
                                    );
                                } else if (isParam) {
                                    valueCell = e.value ?? '—';
                                } else {
                                    valueCell = '—';
                                }
                                return (
                                    <tr
                                        key={e.id}
                                        className="hover:bg-surface-muted/50 transition-colors"
                                    >
                                        <td className="pl-5 py-2.5 whitespace-nowrap">{e.date}</td>
                                        <td className="py-2.5">{e.bu_name}</td>
                                        <td className="py-2.5">{e.machine_name}</td>
                                        <td className="py-2.5">{parameterCell}</td>
                                        <td className="py-2.5">
                                            <KindBadge kind={kind} />
                                        </td>
                                        <td className="py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-2">
                                            {e.test_code || '—'}
                                        </td>
                                        <td className="py-2.5 tabular-nums">{valueCell}</td>
                                        <td className="py-2.5 tabular-nums">
                                            {isParam ? (e.kits_used || '—') : e.kits_used}
                                        </td>
                                        <td className="pr-5 py-2.5 whitespace-nowrap">
                                            <span className="text-ink">{submitterName}</span>
                                            {submitterUsername ? (
                                                <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                                                    @{submitterUsername}
                                                </span>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </DataTableShell>
        </PageShell>
    );
}
