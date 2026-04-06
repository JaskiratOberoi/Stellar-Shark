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
import { BuSummaryTable, GridScanTable } from './components/DataTable.jsx';

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

    return (
        <div className="relative min-h-screen">
            <div className="genomics-bg" aria-hidden />
            <FloatingOrb className="w-[420px] h-[420px] bg-indigo-600/40 top-[5%] left-[10%]" delay={0} />
            <FloatingOrb className="w-[380px] h-[380px] bg-fuchsia-600/30 top-[40%] right-[5%]" delay={2} />
            <FloatingOrb className="w-[320px] h-[320px] bg-cyan-500/25 bottom-[10%] left-[30%]" delay={4} />

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
                <TopStatusBar running={running} result={result} />

                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="font-display text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
                        Daily test volume
                    </h1>
                    <p className="mt-3 text-genomics-fg-muted max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                        Pick BUs · <span className="text-genomics-fg">QUGEN</span> counts rows with{' '}
                        <span className="text-genomics-fg">no</span> lab badge; other labs use{' '}
                        <span className="text-genomics-fg">config/businessUnits.json</span> · +1 per SID · status{' '}
                        <span className="text-genomics-fg">--All--</span> · one full grid pass · optional test code ·
                        read-only
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                    <motion.div
                        className="lg:col-span-5 space-y-6"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08, duration: 0.45 }}
                    >
                        <SectionCard
                            title="Configuration"
                            description="Date range, business units, optional LIS test code, and run actions."
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm text-genomics-fg-muted mb-2" htmlFor="date-from">
                                        From date
                                    </label>
                                    <input
                                        id="date-from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        disabled={running}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-genomics-fg-muted mb-2" htmlFor="date-to">
                                        To date
                                    </label>
                                    <input
                                        id="date-to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        disabled={running}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            {rangeInvalid && (
                                <p className="text-genomics-danger text-sm mb-3">From date must be on or before To date.</p>
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
                            />

                            <TestCodePresets testCode={testCode} setTestCode={setTestCode} running={running} />

                            <p className="text-xs text-genomics-fg-subtle mb-2">Quick range</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {[
                                    { id: 'today', label: 'Today' },
                                    { id: 'week', label: 'Last 7 days' },
                                    { id: 'month', label: 'Month to date' },
                                    { id: 'ytd', label: 'Year to date' }
                                ].map(({ id, label: plabel }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        disabled={running}
                                        onClick={() => applyPreset(id)}
                                        className="btn-ghost px-3 py-1.5"
                                    >
                                        {plabel}
                                    </button>
                                ))}
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer mb-6">
                                <input
                                    type="checkbox"
                                    checked={!headless}
                                    onChange={(e) => setHeadless(!e.target.checked)}
                                    disabled={running}
                                    className="w-4 h-4 rounded border-slate-500 text-genomics-accent focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas"
                                />
                                <span className="text-sm text-genomics-fg-muted">
                                    Headed browser{' '}
                                    <span className="text-genomics-fg-subtle">(visible Chromium for debugging)</span>
                                </span>
                            </label>

                            <div className="sticky bottom-3 z-30 -mx-5 px-4 py-4 mt-2 rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-lg md:static md:border-0 md:bg-transparent md:backdrop-blur-none md:p-0 md:mx-0 md:rounded-none">
                                <div className="flex flex-wrap gap-3">
                                    <motion.button
                                        type="button"
                                        onClick={run}
                                        disabled={running || rangeInvalid || noBuSelected}
                                        whileHover={{ scale: reduceMotion || running ? 1 : 1.02 }}
                                        whileTap={{ scale: reduceMotion || running ? 1 : 0.98 }}
                                        className="btn-primary"
                                    >
                                        {running ? 'Running…' : 'Run count'}
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={stop}
                                        disabled={!running}
                                        whileHover={{ scale: reduceMotion || !running ? 1 : 1.02 }}
                                        whileTap={{ scale: reduceMotion || !running ? 1 : 0.98 }}
                                        className="btn-ghost px-6 py-3 text-sm"
                                    >
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>

                            <p className="mt-6 text-xs text-genomics-fg-subtle leading-relaxed">
                                Default is headless. Credentials: <code className="text-genomics-accent-hover">LIS_*</code>{' '}
                                or <code className="text-genomics-accent-hover">CBC_LOGIN_*</code> in{' '}
                                <code className="text-genomics-accent-hover">.env</code>. Run{' '}
                                <code className="text-genomics-accent-hover">npm run dev</code> (API :3001, UI :5173).
                            </p>
                        </SectionCard>
                    </motion.div>

                    <motion.div
                        className="lg:col-span-7"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.5 }}
                    >
                        <SectionCard variant="emphasis" className="min-h-[300px] md:min-h-[340px]">
                            <MetricHero
                                liveTotal={liveTotal}
                                liveSids={liveSids}
                                liveBu={liveBu}
                                liveStatus={liveStatus}
                                multiBu={result?.multiBu}
                                running={running}
                            />
                            <ResultsMeta result={result} />
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-4 text-genomics-danger text-sm"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </SectionCard>
                    </motion.div>
                </div>

                <motion.div
                    className="mt-8 grid md:grid-cols-2 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.45 }}
                >
                    <SectionCard title="Activity" description="Live stream from the scraper (last 200 lines).">
                        <div className="log-scroll h-52 overflow-y-auto rounded-lg bg-black/35 border border-white/[0.06] p-3 font-mono text-xs text-genomics-fg-muted">
                            {log.length === 0 ? (
                                <span className="text-genomics-fg-subtle">Progress lines appear here…</span>
                            ) : (
                                log.map((entry, i) => (
                                    <div key={`${entry.t}-${i}`} className="py-0.5 border-b border-white/5 last:border-0">
                                        {entry.line}
                                    </div>
                                ))
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Data"
                        description="Per-BU totals and grid scan summary after each completed run."
                    >
                        <h3 className="font-display font-semibold text-white text-sm mb-2">Per business unit</h3>
                        <p className="text-xs text-genomics-fg-subtle mb-3">
                            +1 per SID when the client-code lab badge matches that BU. SIDs are not deduped across BUs.
                        </p>
                        <BuSummaryTable rows={buSummaryRows} />

                        <h3 className="font-display font-semibold text-white text-sm mb-2">Grid scan summary</h3>
                        <p className="text-xs text-genomics-fg-subtle mb-3">
                            {result?.multiBu
                                ? 'Detail rows are omitted for multi-BU runs; see totals above.'
                                : 'One --All-- search per BU; badge rules apply; each SID at most once across pages.'}
                        </p>
                        <GridScanTable rows={perStatusRows} />
                    </SectionCard>
                </motion.div>
            </div>
        </div>
    );
}
