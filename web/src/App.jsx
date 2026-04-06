import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamGenomicsRun, cancelRun } from './streamRun.js';
import BUSINESS_UNIT_OPTIONS from '../../config/businessUnits.json';
import TEST_CODE_PRESETS from './testCodePresets.json';

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

function formatDuration(ms) {
    if (ms == null || !Number.isFinite(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
}

function FloatingOrb({ className, delay = 0 }) {
    return (
        <motion.div
            className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
            initial={{ opacity: 0.3, scale: 0.8 }}
            animate={{
                opacity: [0.35, 0.6, 0.35],
                scale: [0.95, 1.08, 0.95],
                x: [0, 25, -15, 0],
                y: [0, -20, 12, 0]
            }}
            transition={{
                duration: 14 + delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay
            }}
        />
    );
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

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-14">
                <motion.header
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <p className="text-indigo-300/90 text-sm font-medium tracking-widest uppercase mb-2">
                        Genomics · LIS worksheet
                    </p>
                    <h1 className="font-display text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
                        Daily test volume
                    </h1>
                    <p className="mt-3 text-slate-400 max-w-xl mx-auto text-sm md:text-base">
                        Pick BUs · <span className="text-slate-300">QUGEN</span> counts rows with{' '}
                        <span className="text-slate-300">no</span> lab badge; other labs need the exact badge text in{' '}
                        <span className="text-slate-300">config/businessUnits.json</span> · +1 per SID · status{' '}
                        <span className="text-slate-300">--All--</span> · paginate entire grid once · optional test code ·
                        read-only
                    </p>
                </motion.header>

                <div className="grid lg:grid-cols-5 gap-6 items-start">
                    <motion.div
                        className="lg:col-span-2 glass-panel p-6 md:p-8"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                    >
                        <h2 className="font-display font-semibold text-lg text-white mb-5">Run controls</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">From date</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    disabled={running}
                                    className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">To date</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    disabled={running}
                                    className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                                />
                            </div>
                        </div>
                        {rangeInvalid && (
                            <p className="text-rose-400 text-sm mb-3">From date must be on or before To date.</p>
                        )}

                        <div className="mb-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <label className="block text-sm text-slate-400">Business units</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={running}
                                        onClick={selectAllBu}
                                        className="text-xs text-indigo-300 hover:text-indigo-200 disabled:opacity-40"
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        disabled={running}
                                        onClick={clearAllBu}
                                        className="text-xs text-slate-500 hover:text-slate-400 disabled:opacity-40"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            {noBuSelected && (
                                <p className="text-amber-400/90 text-xs mb-2">Select at least one business unit to run.</p>
                            )}
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto log-scroll pr-1">
                                {BUSINESS_UNIT_OPTIONS.map((entry) => {
                                    const label = buEntryLabel(entry);
                                    const badge = buEntryBadge(entry);
                                    const on = selectedBu.has(label);
                                    const title = badge
                                        ? `Lab badge “${badge}” (client-code span.badge)`
                                        : label === 'QUGEN'
                                          ? 'QUGEN: rows with no lab badge count here (central lab)'
                                          : 'Set "badge" in config/businessUnits.json (inspect span.badge in LIS) before running';
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            disabled={running}
                                            aria-pressed={on}
                                            title={title}
                                            onClick={() => toggleBu(label)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                on
                                                    ? 'border-indigo-400/80 bg-indigo-600/35 text-white shadow-sm shadow-indigo-900/30'
                                                    : 'border-white/12 text-slate-400 hover:border-white/25 hover:text-slate-300'
                                            } disabled:opacity-40`}
                                        >
                                            <span>{label}</span>
                                            {badge ? (
                                                <span className="ml-1.5 text-[10px] opacity-80 font-mono">{badge}</span>
                                            ) : label === 'QUGEN' ? (
                                                <span className="ml-1.5 text-[10px] opacity-70 font-mono">no badge</span>
                                            ) : (
                                                <span className="ml-1.5 text-[10px] text-amber-500/85 font-mono">…</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm text-slate-400 mb-2" htmlFor="testcode-input">
                                Test code <span className="text-slate-600">(optional)</span>
                            </label>
                            <input
                                id="testcode-input"
                                type="text"
                                value={testCode}
                                onChange={(e) => setTestCode(e.target.value)}
                                disabled={running}
                                placeholder="Type a code or pick a button below"
                                autoComplete="off"
                                className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 font-mono text-sm"
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={running}
                                    onClick={() => setTestCode('')}
                                    className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40"
                                >
                                    Clear test code
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 mb-3">
                                Sent to LIS “Testcode” as entered. Leave blank to include all tests.
                            </p>
                            <p className="text-xs text-slate-500 mb-2">Quick picks</p>
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto log-scroll pr-1 pb-1">
                                {TEST_CODE_PRESETS.map((preset) => {
                                    const code = String(preset.code || '').trim();
                                    const selected =
                                        testCode.trim().toLowerCase() === code.toLowerCase() && code.length > 0;
                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            disabled={running}
                                            title={
                                                selected
                                                    ? `${preset.label} — click again to clear`
                                                    : `${preset.label} → ${code}`
                                            }
                                            aria-pressed={selected}
                                            onClick={() => {
                                                if (selected) setTestCode('');
                                                else setTestCode(code);
                                            }}
                                            className={`px-2.5 py-1.5 rounded-lg text-left border transition-colors min-w-0 max-w-[11rem] ${
                                                selected
                                                    ? 'border-cyan-400/70 bg-cyan-950/40 text-white ring-1 ring-cyan-500/30'
                                                    : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                                            } disabled:opacity-40`}
                                        >
                                            <span className="block text-[11px] leading-tight truncate">{preset.label}</span>
                                            <span className="block font-mono text-[10px] mt-0.5 text-slate-500">{code}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 mb-2">Quick range</p>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'Last 7 days' },
                                { id: 'month', label: 'Month to date' },
                                { id: 'ytd', label: 'Year to date' }
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    disabled={running}
                                    onClick={() => applyPreset(id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer mb-8">
                            <input
                                type="checkbox"
                                checked={!headless}
                                onChange={(e) => setHeadless(!e.target.checked)}
                                disabled={running}
                                className="w-4 h-4 rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-300">
                                Headed browser <span className="text-slate-500">(visible Chromium for debugging)</span>
                            </span>
                        </label>

                        <div className="flex flex-wrap gap-3">
                            <motion.button
                                type="button"
                                onClick={run}
                                disabled={running || rangeInvalid || noBuSelected}
                                whileHover={{ scale: running ? 1 : 1.02 }}
                                whileTap={{ scale: running ? 1 : 0.98 }}
                                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {running ? 'Running…' : 'Run count'}
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={stop}
                                disabled={!running}
                                whileHover={{ scale: !running ? 1 : 1.02 }}
                                whileTap={{ scale: !running ? 1 : 0.98 }}
                                className="px-6 py-3 rounded-xl font-semibold border border-white/20 text-slate-200 hover:bg-white/5 disabled:opacity-40"
                            >
                                Cancel
                            </motion.button>
                        </div>

                        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
                            Default is headless. Uses the same login URL and credential defaults as the CBC bot; override
                            with <code className="text-indigo-300">LIS_*</code> or{' '}
                            <code className="text-indigo-300">CBC_LOGIN_*</code> in <code className="text-indigo-300">.env</code>.
                            Run <code className="text-indigo-300">npm run dev</code> from project root (API :3001, UI
                            :5173).
                        </p>
                    </motion.div>

                    <motion.div
                        className="lg:col-span-3 glass-panel-strong p-6 md:p-10 min-h-[320px]"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.55 }}
                    >
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
                            <div>
                                <p className="text-indigo-200/80 text-sm font-medium uppercase tracking-wider">
                                    {result?.multiBu ? 'Total samples (selected BUs)' : 'Total samples'}
                                </p>
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={liveTotal ?? 'empty'}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        className="font-display text-5xl md:text-7xl font-bold text-white tabular-nums mt-1"
                                    >
                                        {liveTotal != null ? liveTotal : '—'}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                            <div className="text-right text-sm text-slate-400 space-y-1">
                                <p>
                                    Unique SIDs (badge-matched):{' '}
                                    <span className="text-cyan-300 tabular-nums">{liveSids ?? '—'}</span>
                                </p>
                                <p>
                                    Current BU:{' '}
                                    <span className="text-amber-200/90">{liveBu || (running ? '…' : '—')}</span>
                                </p>
                                <p>
                                    Status:{' '}
                                    <span className="text-fuchsia-300">{liveStatus || (running ? '…' : '—')}</span>
                                </p>
                            </div>
                        </div>

                        {result && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-6 pt-6 border-t border-white/10 text-sm text-slate-400 flex flex-wrap gap-x-6 gap-y-2"
                            >
                                <span>
                                    Finished:{' '}
                                    <span className="text-slate-200">{new Date(result.completedAt).toLocaleString()}</span>
                                </span>
                                <span>
                                    Duration:{' '}
                                    <span className="text-slate-200">{formatDuration(result.durationMs)}</span>
                                </span>
                                <span>
                                    Range:{' '}
                                    <span className="text-slate-200">
                                        {result.dateFrom && result.dateTo
                                            ? result.dateFrom === result.dateTo
                                                ? result.dateFrom
                                                : `${result.dateFrom} → ${result.dateTo}`
                                            : result.date ?? '—'}
                                    </span>
                                </span>
                                {result.testCode ? (
                                    <span>
                                        Test code:{' '}
                                        <span className="text-slate-200 font-mono">{result.testCode}</span>
                                    </span>
                                ) : null}
                                {result.multiBu && result.businessUnits?.length ? (
                                    <span>
                                        BUs:{' '}
                                        <span className="text-slate-200">{result.businessUnits.join(', ')}</span>
                                    </span>
                                ) : result.businessUnit ? (
                                    <span>
                                        BU: <span className="text-slate-200">{result.businessUnit}</span>
                                    </span>
                                ) : null}
                                {result.labBadge ? (
                                    <span>
                                        Lab badge:{' '}
                                        <span className="text-slate-200 font-mono">{result.labBadge}</span>
                                    </span>
                                ) : null}
                            </motion.div>
                        )}

                        {error && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 text-rose-400 text-sm"
                            >
                                {error}
                            </motion.p>
                        )}
                    </motion.div>
                </div>

                <motion.div
                    className="mt-8 grid md:grid-cols-2 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="glass-panel p-5 md:p-6">
                        <h3 className="font-display font-semibold text-white mb-3">Live log</h3>
                        <div className="log-scroll h-48 overflow-y-auto rounded-lg bg-black/30 border border-white/5 p-3 font-mono text-xs text-slate-400">
                            {log.length === 0 ? (
                                <span className="text-slate-600">Progress lines appear here…</span>
                            ) : (
                                log.map((entry, i) => (
                                    <div key={`${entry.t}-${i}`} className="py-0.5 border-b border-white/5 last:border-0">
                                        {entry.line}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="glass-panel p-5 md:p-6">
                        <h3 className="font-display font-semibold text-white mb-3">Per business unit</h3>
                        <p className="text-xs text-slate-500 mb-3">
                            Samples = +1 per SID where the client-code lab badge matches that BU. SIDs are not deduped
                            across different BUs.
                        </p>
                        <div className="overflow-x-auto max-h-40 overflow-y-auto log-scroll rounded-lg border border-white/5 mb-6">
                            <table className="w-full text-left text-xs">
                                <thead className="text-slate-500 sticky top-0 bg-slate-900/95">
                                    <tr>
                                        <th className="p-2">BU</th>
                                        <th className="p-2">Badge</th>
                                        <th className="p-2 text-right">Samples</th>
                                        <th className="p-2 text-right">Unique SIDs</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {buSummaryRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-slate-600">
                                                Run a scan to populate.
                                            </td>
                                        </tr>
                                    ) : (
                                        buSummaryRows.map((row) => (
                                            <tr key={row.businessUnit} className="border-t border-white/5">
                                                <td className="p-2">{row.businessUnit}</td>
                                                <td className="p-2 font-mono text-slate-400">
                                                    {row.labBadge ?? '—'}
                                                </td>
                                                <td className="p-2 text-right tabular-nums text-cyan-300/90">
                                                    {row.totalTests}
                                                </td>
                                                <td className="p-2 text-right tabular-nums">{row.uniqueSids}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <h3 className="font-display font-semibold text-white mb-3">Grid scan summary</h3>
                        <p className="text-xs text-slate-500 mb-3">
                            {result?.multiBu
                                ? 'Shown for single-BU runs only. Multi-BU runs aggregate totals above.'
                                : 'One --All-- search per BU; rows scanned and samples (+1) use lab-badge rules; each SID counted at most once across all pages.'}
                        </p>
                        <div className="overflow-x-auto max-h-52 overflow-y-auto log-scroll rounded-lg border border-white/5">
                            <table className="w-full text-left text-xs">
                                <thead className="text-slate-500 sticky top-0 bg-slate-900/95">
                                    <tr>
                                        <th className="p-2">Status</th>
                                        <th className="p-2 text-right">Rows</th>
                                        <th className="p-2 text-right">Samples +</th>
                                        <th className="p-2 text-right">SIDs +</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {perStatusRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-slate-600">
                                                Run a scan to populate.
                                            </td>
                                        </tr>
                                    ) : (
                                        perStatusRows.map((row) => (
                                            <tr key={row.label} className="border-t border-white/5">
                                                <td className="p-2">
                                                    {row.label}
                                                    {row.skipped && (
                                                        <span className="text-amber-500/90 ml-1">(skipped)</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right tabular-nums">{row.rowsScanned}</td>
                                                <td className="p-2 text-right tabular-nums text-cyan-300/90">
                                                    {row.testsAdded ?? '—'}
                                                </td>
                                                <td className="p-2 text-right tabular-nums">{row.sidsNew ?? '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
