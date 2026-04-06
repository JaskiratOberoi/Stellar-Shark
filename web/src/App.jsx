import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { streamGenomicsRun, cancelRun } from './streamRun.js';
import BUSINESS_UNIT_OPTIONS from '../../config/businessUnits.json';
import { FloatingOrb } from './components/FloatingOrb.jsx';
import { TopStatusBar } from './components/TopStatusBar.jsx';
import { SectionCard } from './components/SectionCard.jsx';
import { BuChipGrid } from './components/BuChipGrid.jsx';
import { TestCodePresets } from './components/TestCodePresets.jsx';
import { MetricHero } from './components/MetricHero.jsx';
import { ResultsMeta } from './components/ResultsMeta.jsx';
import { ResultSidLists } from './components/ResultSidLists.jsx';
import { BuSummaryTable, GridScanTable } from './components/DataTable.jsx';

const DASHBOARD_TAGLINE =
    'Pick BUs · QUGEN = rows with no lab badge; other labs use config/businessUnits.json · +1 per SID · status --All-- · optional test code · read-only.';

function buEntryLabel(entry) {
    return typeof entry === 'string' ? entry : entry.label;
}

function buEntryBadge(entry) {
    return typeof entry === 'string' ? '' : String(entry.badge || '').trim();
}

function todayIsoLocal() {
    const d = new Date();
    return toIsoDate(d);
}

function toIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDaysLocal(iso, delta) {
    const [y, mo, da] = iso.split('-').map(Number);
    const dt = new Date(y, mo - 1, da);
    dt.setDate(dt.getDate() + delta);
    return toIsoDate(dt);
}

function startOfMonthLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function startOfYearLocal() {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
}

export default function App() {
    const t = todayIsoLocal();
    const [dateFrom, setDateFrom] = useState(t);
    const [dateTo, setDateTo] = useState(t);
    const [selectedBu, setSelectedBu] = useState(() => new Set(['QUGEN']));
    const [testCode, setTestCode] = useState('');
    const [headless, setHeadless] = useState(true);
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [liveTotal, setLiveTotal] = useState(null);
    const [liveSids, setLiveSids] = useState(null);
    const [liveStatus, setLiveStatus] = useState(null);
    const [liveBu, setLiveBu] = useState(null);
    const abortRef = useRef(null);
    const reduceMotion = useReducedMotion();

    const selectedBuList = useMemo(() => [...selectedBu], [selectedBu]);
    const noBuSelected = selectedBuList.length === 0;

    const toggleBu = useCallback((label) => {
        setSelectedBu((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    }, []);

    const selectAllBu = useCallback(() => {
        setSelectedBu(new Set(BUSINESS_UNIT_OPTIONS.map(buEntryLabel)));
    }, []);

    const clearAllBu = useCallback(() => {
        setSelectedBu(new Set());
    }, []);

    const appendLog = useCallback((line) => {
        setLog((prev) => [...prev.slice(-200), { t: Date.now(), line }]);
    }, []);

    const handleEvent = useCallback(
        (evt) => {
            if (evt.type === 'phase') {
                appendLog(evt.message || evt.phase);
                if (evt.statusLabel) setLiveStatus(evt.statusLabel);
                if (evt.businessUnit) setLiveBu(evt.businessUnit);
            } else if (evt.type === 'progress') {
                setLiveTotal(evt.totalTestsSoFar);
                setLiveSids(evt.uniqueSids);
                if (evt.statusLabel) setLiveStatus(evt.statusLabel);
                if (evt.businessUnit) setLiveBu(evt.businessUnit);
            } else if (evt.type === 'info' || evt.type === 'warn') {
                appendLog(evt.message || JSON.stringify(evt));
            } else if (evt.type === 'done' && evt.result) {
                setResult(evt.result);
                setLiveTotal(evt.result.totalTests);
                setLiveSids(evt.result.uniqueSids);
                setLiveBu(null);
                appendLog(
                    evt.result.multiBu
                        ? `Done: ${evt.result.totalTests} samples, ${evt.result.uniqueSids} unique SIDs summed across BUs`
                        : `Done: ${evt.result.totalTests} samples, ${evt.result.uniqueSids} unique SIDs`
                );
            } else if (evt.type === 'error') {
                setError(evt.message || 'Unknown error');
                appendLog(`Error: ${evt.message}`);
            } else if (evt.type === 'cancelled') {
                appendLog('Cancelled.');
            }
        },
        [appendLog]
    );

    const run = useCallback(async () => {
        setRunning(true);
        setError(null);
        setResult(null);
        setLog([]);
        setLiveTotal(null);
        setLiveSids(null);
        setLiveStatus(null);
        setLiveBu(null);
        abortRef.current = new AbortController();
        try {
            await streamGenomicsRun(
                {
                    dateFrom,
                    dateTo,
                    businessUnits: selectedBuList,
                    testCode: testCode.trim(),
                    headless
                },
                handleEvent,
                abortRef.current.signal
            );
        } catch (e) {
            if (e.name === 'AbortError') {
                appendLog('Aborted.');
            } else {
                setError(e.message || String(e));
                appendLog(String(e.message || e));
            }
        } finally {
            setRunning(false);
            abortRef.current = null;
        }
    }, [dateFrom, dateTo, headless, handleEvent, appendLog, selectedBuList, testCode]);

    const rangeInvalid = dateFrom > dateTo;
    const applyPreset = (kind) => {
        const today = todayIsoLocal();
        if (kind === 'today') {
            setDateFrom(today);
            setDateTo(today);
        } else if (kind === 'yesterday') {
            const y = addDaysLocal(today, -1);
            setDateFrom(y);
            setDateTo(y);
        } else if (kind === 'ereyesterday') {
            const e = addDaysLocal(today, -2);
            setDateFrom(e);
            setDateTo(e);
        } else if (kind === 'week') {
            setDateFrom(addDaysLocal(today, -6));
            setDateTo(today);
        } else if (kind === 'month') {
            setDateFrom(startOfMonthLocal());
            setDateTo(today);
        } else if (kind === 'ytd') {
            setDateFrom(startOfYearLocal());
            setDateTo(today);
        }
    };

    const stop = useCallback(async () => {
        abortRef.current?.abort();
        await cancelRun();
    }, []);

    const perStatusRows = useMemo(() => {
        if (result?.multiBu) return [];
        return result?.perStatus || [];
    }, [result]);

    const buSummaryRows = useMemo(() => {
        if (result?.multiBu && Array.isArray(result.results)) return result.results;
        if (result && !result.multiBu && result.businessUnit) {
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
    }, [result]);

    const runFooter = (
        <div className="flex flex-wrap gap-2">
            <motion.button
                type="button"
                onClick={run}
                disabled={running || rangeInvalid || noBuSelected}
                whileHover={{ scale: reduceMotion || running ? 1 : 1.02 }}
                whileTap={{ scale: reduceMotion || running ? 1 : 0.98 }}
                className="btn-primary text-sm py-2 px-4"
            >
                {running ? 'Running…' : 'Run count'}
            </motion.button>
            <motion.button
                type="button"
                onClick={stop}
                disabled={!running}
                whileHover={{ scale: reduceMotion || !running ? 1 : 1.02 }}
                whileTap={{ scale: reduceMotion || !running ? 1 : 0.98 }}
                className="btn-ghost px-4 py-2 text-sm"
            >
                Cancel
            </motion.button>
        </div>
    );

    return (
        <div className="relative min-h-dvh md:h-dvh md:max-h-dvh md:flex md:flex-col md:overflow-hidden">
            <div className="genomics-bg" aria-hidden />
            <FloatingOrb className="w-[420px] h-[420px] bg-indigo-600/40 top-[5%] left-[10%]" delay={0} />
            <FloatingOrb className="w-[380px] h-[380px] bg-fuchsia-600/30 top-[40%] right-[5%]" delay={2} />
            <FloatingOrb className="w-[320px] h-[320px] bg-cyan-500/25 bottom-[10%] left-[30%]" delay={4} />

            <div className="relative z-10 flex flex-1 min-h-0 min-w-0 flex-col w-full max-w-[1600px] mx-auto px-2 py-2 sm:px-3 md:overflow-hidden">
                <TopStatusBar running={running} result={result} tagline={DASHBOARD_TAGLINE} />

                <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto md:overflow-hidden pb-2 md:pb-0">
                    <div className="flex-1 min-h-0 grid lg:grid-cols-12 gap-2 lg:gap-3 min-h-[280px] lg:min-h-0">
                        <motion.div
                            className="lg:col-span-5 flex min-h-0 flex-col"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.06, duration: 0.4 }}
                        >
                            <SectionCard
                                title="Configuration"
                                description="Dates, BUs, optional test code."
                                dense
                                scrollBody
                                bodyClassName="space-y-0 pr-0.5"
                                className="flex-1 min-h-0 h-full"
                                footer={runFooter}
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                    <div>
                                        <label
                                            className="block text-xs text-genomics-fg-muted mb-1"
                                            htmlFor="date-from"
                                        >
                                            From
                                        </label>
                                        <input
                                            id="date-from"
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            disabled={running}
                                            className="input-field text-sm py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-genomics-fg-muted mb-1" htmlFor="date-to">
                                            To
                                        </label>
                                        <input
                                            id="date-to"
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            disabled={running}
                                            className="input-field text-sm py-2"
                                        />
                                    </div>
                                </div>
                                {rangeInvalid && (
                                    <p className="text-genomics-danger text-xs mb-2">
                                        From must be on or before To.
                                    </p>
                                )}

                                <BuChipGrid
                                    entries={BUSINESS_UNIT_OPTIONS}
                                    buEntryLabel={buEntryLabel}
                                    buEntryBadge={buEntryBadge}
                                    selectedBu={selectedBu}
                                    toggleBu={toggleBu}
                                    selectAllBu={selectAllBu}
                                    clearAllBu={clearAllBu}
                                    running={running}
                                    noBuSelected={noBuSelected}
                                    compact
                                />

                                <TestCodePresets
                                    testCode={testCode}
                                    setTestCode={setTestCode}
                                    running={running}
                                    compact
                                />

                                <p className="text-[10px] text-genomics-fg-subtle mb-1.5">Quick range</p>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {[
                                        { id: 'today', label: 'Today' },
                                        { id: 'yesterday', label: 'Yesterday' },
                                        { id: 'ereyesterday', label: 'Ereyesterday' },
                                        { id: 'week', label: '7d' },
                                        { id: 'month', label: 'MTD' },
                                        { id: 'ytd', label: 'YTD' }
                                    ].map(({ id, label: plabel }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            disabled={running}
                                            onClick={() => applyPreset(id)}
                                            className="btn-ghost px-2 py-1 text-xs"
                                        >
                                            {plabel}
                                        </button>
                                    ))}
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        checked={!headless}
                                        onChange={(e) => setHeadless(!e.target.checked)}
                                        disabled={running}
                                        className="w-3.5 h-3.5 rounded border-slate-500 text-genomics-accent focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas"
                                    />
                                    <span className="text-xs text-genomics-fg-muted">
                                        Headed browser <span className="text-genomics-fg-subtle">(debug)</span>
                                    </span>
                                </label>

                                <details className="text-[10px] text-genomics-fg-subtle leading-snug group mb-1">
                                    <summary className="cursor-pointer text-genomics-accent hover:text-genomics-accent-hover list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                                        <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                                        Env &amp; dev
                                    </summary>
                                    <p className="mt-1.5 pl-3 border-l border-white/10">
                                        Default headless. Credentials:{' '}
                                        <code className="text-genomics-accent-hover">LIS_*</code> or{' '}
                                        <code className="text-genomics-accent-hover">CBC_LOGIN_*</code> in{' '}
                                        <code className="text-genomics-accent-hover">.env</code>. Run{' '}
                                        <code className="text-genomics-accent-hover">npm run dev</code> (API :3001, UI
                                        :5173).
                                    </p>
                                </details>
                            </SectionCard>
                        </motion.div>

                        <motion.div
                            className="lg:col-span-7 flex min-h-0 flex-col min-h-[220px] lg:min-h-0"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.42 }}
                        >
                            <SectionCard
                                variant="emphasis"
                                dense
                                scrollBody
                                bodyClassName="space-y-1 pr-0.5"
                                className="flex-1 min-h-0 h-full"
                                title="Results"
                                description="Live totals while running; full meta when done."
                            >
                                <MetricHero
                                    liveTotal={liveTotal}
                                    liveSids={liveSids}
                                    liveBu={liveBu}
                                    liveStatus={liveStatus}
                                    multiBu={result?.multiBu}
                                    running={running}
                                    compact
                                />
                                <ResultsMeta result={result} compact />
                                <ResultSidLists result={result} />
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-genomics-danger text-xs"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </SectionCard>
                        </motion.div>
                    </div>

                    <motion.div
                        className="shrink-0 grid md:grid-cols-2 gap-2 md:max-h-[min(30dvh,240px)] md:min-h-[120px] flex-1 min-h-[200px] md:flex-none md:min-h-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.14, duration: 0.4 }}
                    >
                        <SectionCard
                            title="Activity"
                            description="Last 200 lines."
                            dense
                            scrollBody
                            bodyClassName="p-0"
                            className="min-h-0 h-full md:max-h-full flex flex-col"
                        >
                            <div className="rounded-md bg-black/35 border border-white/[0.06] px-2 py-1.5 font-mono text-[11px] text-genomics-fg-muted min-h-[4rem]">
                                {log.length === 0 ? (
                                    <span className="text-genomics-fg-subtle">Progress lines appear here…</span>
                                ) : (
                                    log.map((entry, i) => (
                                        <div
                                            key={`${entry.t}-${i}`}
                                            className="py-0.5 border-b border-white/5 last:border-0 leading-snug"
                                        >
                                            {entry.line}
                                        </div>
                                    ))
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="Data"
                            description="Per-BU and grid scan (scroll if needed)."
                            dense
                            scrollBody
                            bodyClassName="space-y-2 pr-0.5"
                            className="min-h-0 h-full md:max-h-full flex flex-col"
                        >
                            <div>
                                <h3 className="font-display font-semibold text-white text-xs mb-0.5">
                                    Per business unit
                                </h3>
                                <p className="text-[10px] text-genomics-fg-subtle mb-1 leading-snug">
                                    +1/SID when lab badge matches BU. SIDs not deduped across BUs.
                                </p>
                                <BuSummaryTable rows={buSummaryRows} maxClass="max-h-32 mb-3" />
                            </div>
                            <div>
                                <h3 className="font-display font-semibold text-white text-xs mb-0.5">
                                    Grid scan summary
                                </h3>
                                <p className="text-[10px] text-genomics-fg-subtle mb-1 leading-snug">
                                    {result?.multiBu
                                        ? 'Detail rows omitted for multi-BU; see totals above.'
                                        : 'One --All-- search per BU; each SID at most once across pages.'}
                                </p>
                                <GridScanTable rows={perStatusRows} maxClass="max-h-36" />
                            </div>
                        </SectionCard>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
