import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

const CHART_AXIS = { fill: '#64748b', fontSize: 11 };
const CHART_GRID = { stroke: '#e2e8f0' };
const PRIMARY = '#0284c7';
const PRIMARY_SOFT = '#bae6fd';
const MUTED_LINE = '#94a3b8';

function totalSamplesFromResult(result) {
    if (!result || typeof result !== 'object') return null;
    if (result.multiBu && Array.isArray(result.results)) {
        return result.results.reduce((s, x) => s + (Number(x.totalTests) || 0), 0);
    }
    if (result.totalTests != null) return Number(result.totalTests);
    return null;
}

/** One LIS total per BU per day (validation duplicates BU across machines). */
function validationLisByDate(rows) {
    const byDateBu = new Map();
    for (const row of rows) {
        const d = row.date != null ? String(row.date).slice(0, 10) : '';
        if (!d) continue;
        const bu = row.bu_id;
        if (bu == null) continue;
        const lis = row.shark_count != null ? Number(row.shark_count) : NaN;
        if (!Number.isFinite(lis)) continue;
        const k = `${d}|${bu}`;
        const prev = byDateBu.get(k);
        byDateBu.set(k, prev == null ? lis : Math.max(prev, lis));
    }
    const byDate = new Map();
    for (const [k, v] of byDateBu) {
        const date = k.split('|')[0];
        byDate.set(date, (byDate.get(date) || 0) + v);
    }
    return [...byDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, lisTotal]) => ({ date, lisTotal }));
}

function aggregateRunVolumeByDay(runs, dayCount) {
    const map = new Map();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - dayCount);
    start.setHours(0, 0, 0, 0);

    for (const run of runs) {
        const t = run.savedAt ? new Date(run.savedAt) : null;
        if (!t || t < start) continue;
        const day = t.toISOString().slice(0, 10);
        let res = run.result;
        if (typeof res === 'string') {
            try {
                res = JSON.parse(res);
            } catch {
                res = null;
            }
        }
        const n = totalSamplesFromResult(res);
        if (n == null || !Number.isFinite(n)) continue;
        map.set(day, (map.get(day) || 0) + n);
    }

    const out = [];
    for (let i = 0; i <= dayCount; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, samples: map.get(key) || 0 });
    }
    return out;
}

function quantityByBu(rows) {
    const m = new Map();
    for (const r of rows) {
        const name = r.bu_name || 'Unknown';
        const q = Number(r.quantity) || 0;
        m.set(name, (m.get(name) || 0) + q);
    }
    return [...m.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity);
}

function alignValidationToDays(validationSeries, dayCount) {
    const map = new Map(validationSeries.map((x) => [x.date, x.lisTotal]));
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - dayCount);
    start.setHours(0, 0, 0, 0);
    const out = [];
    for (let i = 0; i <= dayCount; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, lisTotal: map.get(key) ?? 0 });
    }
    return out;
}

const fmtInt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : '—');

function ChartCard({ title, subtitle, children }) {
    return (
        <div className="lab-card p-4 md:p-5 shadow-card flex flex-col min-h-[320px]">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                {subtitle ? <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p> : null}
            </div>
            <div className="flex-1 min-h-[260px] w-full">{children}</div>
        </div>
    );
}

export function AdminAnalyticsPage() {
    const dayCount = 30;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [counts, setCounts] = useState(null);
    const [runSeries, setRunSeries] = useState([]);
    const [validationSeries, setValidationSeries] = useState([]);
    const [invByBu, setInvByBu] = useState([]);

    const fromStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - dayCount);
        return d.toISOString().slice(0, 10);
    }, []);
    const toStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [dashRes, valRes, invRes, runsRes] = await Promise.all([
                apiFetch('/api/admin/dashboard'),
                apiFetch(`/api/admin/validation?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`),
                apiFetch('/api/admin/inventory/by-bu'),
                apiFetch('/api/run-history')
            ]);

            const dashJ = await dashRes.json();
            if (!dashRes.ok) throw new Error(dashJ.error || 'Dashboard metrics failed');

            const valJ = await valRes.json();
            if (!valRes.ok) throw new Error(valJ.error || 'Validation data failed');

            const invJ = await invRes.json();
            if (!invRes.ok) throw new Error(invJ.error || 'Inventory data failed');

            const runsJ = runsRes.ok ? await runsRes.json() : { runs: [] };
            const runs = Array.isArray(runsJ.runs) ? runsJ.runs : [];

            setCounts(dashJ.counts || null);
            setValidationSeries(alignValidationToDays(validationLisByDate(valJ.rows || []), dayCount));
            setInvByBu(quantityByBu(invJ.rows || []));
            setRunSeries(aggregateRunVolumeByDay(runs, dayCount));
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    }, [fromStr, toStr]);

    useEffect(() => {
        void load();
    }, [load]);

    const platformData = useMemo(() => {
        if (!counts) return [];
        return [
            { name: 'BUs', value: counts.businessUnits },
            { name: 'Machines', value: counts.machines },
            { name: 'Kits', value: counts.kits },
            { name: 'Parameters', value: counts.parameters },
            { name: 'Stock lines', value: counts.inventoryItems }
        ];
    }, [counts]);

    const tickDates = (s) => {
        const str = String(s);
        return str.length >= 10 ? str.slice(5) : str;
    };

    return (
        <PageShell
            badge="Admin · Insights"
            badgeIcon={BarChart3}
            title="Analytics"
            description="Operational analytics and cross-cutting views. Detailed LIS volume and run history live on Teller; reconciliation tooling lives under Validation."
            error={error}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <p className="text-sm text-ink-secondary max-w-xl">
                    Charts refresh on load. Run volume uses saved Teller runs; validation totals de-duplicate LIS counts per
                    business unit per day then sum across BUs.
                </p>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="shrink-0 px-4 py-2 rounded-lg border border-border text-xs font-semibold uppercase tracking-wider text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
                >
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>

            <div className="lab-card p-6 md:p-8 space-y-6 max-w-2xl mb-8">
                <p className="text-sm text-ink-secondary leading-relaxed">
                    Use the modules below for day-to-day numbers and quality checks.
                </p>
                <ul className="space-y-3 text-sm">
                    <li>
                        <Link
                            to="/teller/dashboard"
                            className="font-medium text-primary hover:text-primary/90 underline-offset-2 hover:underline"
                        >
                            Teller
                        </Link>
                        <span className="text-ink-muted"> — daily Genomics LIS test volume, reports, and scheduler</span>
                    </li>
                    <li>
                        <Link
                            to="/admin/validation"
                            className="font-medium text-primary hover:text-primary/90 underline-offset-2 hover:underline"
                        >
                            Validation
                        </Link>
                        <span className="text-ink-muted"> — Teller vs lab counts by day and business unit</span>
                    </li>
                    <li>
                        <Link
                            to="/admin/inventory"
                            className="font-medium text-primary hover:text-primary/90 underline-offset-2 hover:underline"
                        >
                            Inventory
                        </Link>
                        <span className="text-ink-muted"> — stock, allocations, and usage</span>
                    </li>
                </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Platform footprint" subtitle="Active configuration counts">
                    {loading ? (
                        <p className="text-sm text-ink-muted py-16 text-center">Loading…</p>
                    ) : counts ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={platformData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID.stroke} vertical={false} />
                                <XAxis dataKey="name" tick={CHART_AXIS} axisLine={{ stroke: CHART_GRID.stroke }} />
                                <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    formatter={(v) => [fmtInt(v), 'Count']}
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12
                                    }}
                                />
                                <Bar dataKey="value" fill={PRIMARY} radius={[6, 6, 0, 0]} name="Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-ink-muted py-16 text-center">Could not load metrics</p>
                    )}
                </ChartCard>

                <ChartCard
                    title="Teller run volume"
                    subtitle={`Samples reported per day (last ${dayCount + 1} days, from saved runs)`}
                >
                    {loading ? (
                        <p className="text-sm text-ink-muted py-16 text-center">Loading…</p>
                    ) : runSeries.some((x) => x.samples > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={runSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="runVolFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID.stroke} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={tickDates}
                                    tick={CHART_AXIS}
                                    axisLine={{ stroke: CHART_GRID.stroke }}
                                    interval="preserveStartEnd"
                                    minTickGap={28}
                                />
                                <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    labelFormatter={(l) => `Date ${l}`}
                                    formatter={(v) => [fmtInt(v), 'Samples']}
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="samples"
                                    stroke={PRIMARY}
                                    strokeWidth={2}
                                    fill="url(#runVolFill)"
                                    name="Samples"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-ink-muted py-16 text-center px-4">
                            No runs in this window. Complete a run from Teller or the scheduler.
                        </p>
                    )}
                </ChartCard>

                <ChartCard
                    title="Validation LIS totals"
                    subtitle="Sum of BU-level LIS counts per day (deduped per BU)"
                >
                    {loading ? (
                        <p className="text-sm text-ink-muted py-16 text-center">Loading…</p>
                    ) : validationSeries.some((x) => x.lisTotal > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={validationSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={MUTED_LINE} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={MUTED_LINE} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID.stroke} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={tickDates}
                                    tick={CHART_AXIS}
                                    axisLine={{ stroke: CHART_GRID.stroke }}
                                    interval="preserveStartEnd"
                                    minTickGap={28}
                                />
                                <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    labelFormatter={(l) => `Date ${l}`}
                                    formatter={(v) => [fmtInt(v), 'LIS total']}
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="lisTotal"
                                    stroke={MUTED_LINE}
                                    strokeWidth={2}
                                    fill="url(#valFill)"
                                    name="LIS"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-ink-muted py-16 text-center px-4">
                            No validation rows in this window. Runs saved to Reports sync into validation when configured.
                        </p>
                    )}
                </ChartCard>

                <ChartCard
                    title="Inventory allocated by BU"
                    subtitle="Sum of quantities held at each business unit"
                >
                    {loading ? (
                        <p className="text-sm text-ink-muted py-16 text-center">Loading…</p>
                    ) : invByBu.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={invByBu}
                                layout="vertical"
                                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID.stroke} horizontal={false} />
                                <XAxis type="number" tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={100}
                                    tick={CHART_AXIS}
                                    axisLine={{ stroke: CHART_GRID.stroke }}
                                />
                                <Tooltip
                                    formatter={(v) => [fmtInt(v), 'Units']}
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12
                                    }}
                                />
                                <Bar dataKey="quantity" fill={PRIMARY_SOFT} stroke={PRIMARY} strokeWidth={1} radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-ink-muted py-16 text-center px-4">
                            No BU stock rows. Send inventory from the central pool on the Inventory page.
                        </p>
                    )}
                </ChartCard>
            </div>
        </PageShell>
    );
}
