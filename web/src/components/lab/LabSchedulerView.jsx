import { useCallback, useEffect, useState } from 'react';
import BUSINESS_UNIT_OPTIONS from '../../../../config/businessUnits.json';
import { apiFetch } from '../../apiClient.js';
import { TestCodePresets } from '../TestCodePresets.jsx';

function buEntryLabel(entry) {
    return typeof entry === 'string' ? entry : entry.label;
}

function formatRunCounts(run) {
    if (run.status !== 'ok' || !run.result) return '—';
    const r = run.result;
    if (r.multiBu) {
        return `${r.totalTests ?? '—'} samples · ${r.uniqueSids ?? '—'} SIDs`;
    }
    return `${r.totalTests ?? '—'} samples · ${r.uniqueSids ?? '—'} SIDs`;
}

const DATE_PRESET_OPTIONS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday (previous day)' },
    { id: 'last7', label: 'Last 7 days' },
    { id: 'mtd', label: 'Month to date' },
    { id: 'ytd', label: 'Year to date' }
];

function presetLabel(id) {
    return DATE_PRESET_OPTIONS.find((p) => p.id === id)?.label || id;
}

function schedulerFetchError(status) {
    if (status === 404) {
        return 'API returned 404. Run the Node server on port 3101 (from the repo root: npm run dev, or npm run dev:server). Restart it if it was started before the Scheduler was added. If you use vite preview, pull latest and restart preview so /api is proxied.';
    }
    return `HTTP ${status}`;
}

export function LabSchedulerView() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [schedules, setSchedules] = useState([]);
    const [runs, setRuns] = useState([]);

    const [draftTime, setDraftTime] = useState('09:00');
    const [draftLabel, setDraftLabel] = useState('');
    const [draftBu, setDraftBu] = useState(() => new Set(['QUGEN']));
    const [draftTestCode, setDraftTestCode] = useState('');
    const [draftHeadless, setDraftHeadless] = useState(true);
    const [draftEnabled, setDraftEnabled] = useState(true);
    const [draftDatePreset, setDraftDatePreset] = useState('yesterday');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch('/api/scheduler');
            if (!res.ok) throw new Error(schedulerFetchError(res.status));
            const data = await res.json();
            setTimezone(data.timezone || 'Asia/Kolkata');
            setSchedules(Array.isArray(data.schedules) ? data.schedules : []);
            setRuns(Array.isArray(data.runs) ? data.runs : []);
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const toggleDraftBu = useCallback((label) => {
        setDraftBu((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    }, []);

    const persist = useCallback(
        async (nextSchedules) => {
            setSaving(true);
            setError(null);
            try {
                const res = await apiFetch('/api/scheduler', {
                    method: 'PUT',
                    body: JSON.stringify({ schedules: nextSchedules })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || schedulerFetchError(res.status));
                setSchedules(data.schedules || nextSchedules);
                await load();
            } catch (e) {
                setError(e.message || String(e));
            } finally {
                setSaving(false);
            }
        },
        [load]
    );

    const addSchedule = useCallback(() => {
        const businessUnits = [...draftBu];
        if (businessUnits.length === 0) {
            setError('Select at least one business unit.');
            return;
        }
        const next = [
            ...schedules,
            {
                enabled: draftEnabled,
                timeLocal: draftTime,
                label: draftLabel.trim(),
                businessUnits,
                testCode: draftTestCode.trim(),
                headless: draftHeadless,
                datePreset: draftDatePreset
            }
        ];
        persist(next);
    }, [
        schedules,
        draftEnabled,
        draftTime,
        draftLabel,
        draftBu,
        draftTestCode,
        draftHeadless,
        draftDatePreset,
        persist
    ]);

    const removeSchedule = useCallback(
        (id) => {
            persist(schedules.filter((s) => s.id !== id));
        },
        [schedules, persist]
    );

    const toggleScheduleEnabled = useCallback(
        (id) => {
            persist(
                schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
            );
        },
        [schedules, persist]
    );

    if (loading) {
        return (
            <div className="lab-card max-w-2xl">
                <p className="text-sm text-slate-400">Loading scheduler…</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 min-h-0 flex flex-col flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">Scheduler</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Run the LIS bot at fixed clock times in the server timezone (
                        <span className="text-slate-400 font-mono text-xs">{timezone}</span>
                        ). Pick a <strong className="text-slate-400">counter timeframe</strong> per job (e.g.{' '}
                        <em>Yesterday</em> for a 00:10 job that counts the previous calendar day). Schedules and logs
                        persist under the app data directory. Successful runs also appear in{' '}
                        <strong className="text-slate-400">Reports</strong> automatically.
                    </p>
                </div>
                <button type="button" onClick={load} className="nexus-btn-ghost">
                    Refresh
                </button>
            </div>

            {error ? (
                <p className="text-sm text-rose-400 border border-rose-500/30 rounded-lg px-3 py-2 bg-rose-950/20">
                    {error}
                </p>
            ) : null}

            <div className="lab-card space-y-4">
                <h3 className="text-sm font-semibold text-white">New schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[10px] text-slate-500 mb-1 block" htmlFor="sch-time">
                            Local time ({timezone})
                        </label>
                        <input
                            id="sch-time"
                            type="time"
                            value={draftTime}
                            onChange={(e) => setDraftTime(e.target.value)}
                            className="lab-input text-sm py-2 w-full"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 mb-1 block" htmlFor="sch-label">
                            Label (optional)
                        </label>
                        <input
                            id="sch-label"
                            type="text"
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                            placeholder="Morning pull"
                            className="lab-input text-sm py-2 w-full"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 mb-1 block" htmlFor="sch-preset">
                            Counter timeframe
                        </label>
                        <select
                            id="sch-preset"
                            value={draftDatePreset}
                            onChange={(e) => setDraftDatePreset(e.target.value)}
                            className="lab-input text-sm py-2 w-full"
                        >
                            {DATE_PRESET_OPTIONS.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 pb-2">
                            <input
                                type="checkbox"
                                checked={draftEnabled}
                                onChange={(e) => setDraftEnabled(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-600"
                            />
                            Enabled
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 pb-2">
                            <input
                                type="checkbox"
                                checked={!draftHeadless}
                                onChange={(e) => setDraftHeadless(!e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-600"
                            />
                            Headed (debug)
                        </label>
                    </div>
                </div>
                <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
                        Business units
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {BUSINESS_UNIT_OPTIONS.map((entry) => {
                            const label = buEntryLabel(entry);
                            const on = draftBu.has(label);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => toggleDraftBu(label)}
                                    className={
                                        on
                                            ? 'px-2.5 py-1 text-xs font-mono uppercase border border-ink bg-accent text-accent-ink'
                                            : 'px-2.5 py-1 text-xs font-mono uppercase border border-rule-soft text-ink-3 hover:text-ink hover:border-ink'
                                    }
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="max-w-xl">
                    <TestCodePresets
                        testCode={draftTestCode}
                        setTestCode={setDraftTestCode}
                        running={saving}
                        compact
                    />
                </div>
                <button
                    type="button"
                    onClick={addSchedule}
                    disabled={saving}
                    className="nexus-btn-accent"
                >
                    {saving ? 'Saving' : 'Add schedule'}
                </button>
            </div>

            <div className="border border-rule-soft bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-rule-soft bg-surface-2">
                    <span className="font-mono uppercase text-eyebrow text-ink-2">
                        Active schedules <span className="text-ink-3">/</span>{' '}
                        <span className="num">{schedules.length}</span>
                    </span>
                </div>
                {schedules.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No schedules yet. Add one above.</p>
                ) : (
                    <ul className="divide-y divide-rule-soft">
                        {schedules.map((s) => (
                            <li
                                key={s.id}
                                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                            >
                                <div>
                                    <span className="text-white font-mono tabular-nums">{s.timeLocal}</span>
                                    {s.label ? (
                                        <span className="text-slate-400 ml-2">{s.label}</span>
                                    ) : null}
                                    <span className="text-slate-500 block text-xs mt-1">
                                        {presetLabel(s.datePreset || 'today')}
                                        {' · '}
                                        {s.businessUnits.join(', ')}
                                        {s.testCode ? ` · code ${s.testCode}` : ''}
                                        {s.headless === false ? ' · headed' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleScheduleEnabled(s.id)}
                                        disabled={saving}
                                        className={
                                            s.enabled
                                                ? 'px-2 py-1 font-mono text-eyebrow uppercase text-signal-success border border-signal-success'
                                                : 'px-2 py-1 font-mono text-eyebrow uppercase text-ink-3 border border-rule-soft'
                                        }
                                    >
                                        {s.enabled ? 'On' : 'Off'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeSchedule(s.id)}
                                        disabled={saving}
                                        className="text-xs text-rose-400/90 hover:text-rose-300 px-2 py-1"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="border border-rule-soft bg-surface overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="px-4 py-3 border-b border-rule-soft bg-surface-2">
                    <span className="font-mono uppercase text-eyebrow text-ink-2">
                        Run history <span className="text-ink-3">/</span> server
                    </span>
                    <p className="font-mono text-eyebrow text-ink-3 mt-1">
                        Successful jobs are saved here and in Reports automatically.
                    </p>
                </div>
                <div className="flex-1 min-h-0 overflow-auto log-scroll max-h-[min(28rem,50vh)]">
                    {runs.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                            No scheduled runs yet. After the server executes a job, counts appear here.
                        </p>
                    ) : (
                        <table className="text-xs w-full border-collapse">
                            <thead>
                                <tr className="border-b border-rule-soft text-left font-mono uppercase text-eyebrow text-ink-2 bg-surface-2">
                                    <th className="px-3 py-2 font-semibold">When (UTC)</th>
                                    <th className="px-3 py-2 font-semibold">Label</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-3 py-2 font-semibold">Counts</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {runs.map((r) => (
                                    <tr key={r.id} className="border-b border-rule-soft hover:bg-surface-2 transition-colors duration-150 ease-snap">
                                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[10px] text-slate-400">
                                            {r.runAt}
                                        </td>
                                        <td className="px-3 py-2">{r.scheduleLabel || '—'}</td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={
                                                    r.status === 'ok'
                                                        ? 'text-emerald-400'
                                                        : r.status === 'skipped'
                                                          ? 'text-amber-400'
                                                          : r.status === 'cancelled'
                                                            ? 'text-slate-500'
                                                            : 'text-rose-400'
                                                }
                                            >
                                                {r.status}
                                            </span>
                                            {r.message ? (
                                                <span className="block text-[10px] text-slate-500 mt-0.5 truncate max-w-[14rem]">
                                                    {r.message}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-3 py-2 tabular-nums">{formatRunCounts(r)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <p className="text-[10px] text-slate-600 leading-relaxed max-w-3xl">
                The API server must stay running for schedules to fire. If a run is already in progress (including from
                the Dashboard), a scheduled job is skipped and logged. Cancel an active run from the Dashboard as usual.
            </p>
        </div>
    );
}
