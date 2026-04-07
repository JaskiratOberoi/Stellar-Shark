import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { streamGenomicsRun, cancelRun } from './streamRun.js';
import BUSINESS_UNIT_OPTIONS from '../../config/businessUnits.json';
import { BuChipGrid } from './components/BuChipGrid.jsx';
import { TestCodePresets } from './components/TestCodePresets.jsx';
import { BuSummaryTable, GridScanTable } from './components/DataTable.jsx';
import { LabTopNav } from './components/lab/LabTopNav.jsx';
import { LabStatHero } from './components/lab/LabStatHero.jsx';
import { LabActivityPanel } from './components/lab/LabActivityPanel.jsx';
import { LabSidsPanel } from './components/lab/LabSidsPanel.jsx';
import { LabReportsView } from './components/lab/LabReportsView.jsx';
import { LabSchedulerView } from './components/lab/LabSchedulerView.jsx';
import { appendRunRecord } from './runHistoryStore.js';

const LS_LAST_SNAPSHOT = 'labintel_last_snapshot';

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
    const [vsPrevPct, setVsPrevPct] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [runHistoryVersion, setRunHistoryVersion] = useState(0);
    const abortRef = useRef(null);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        const bump = () => setRunHistoryVersion((v) => v + 1);
        window.addEventListener('labintel-run-history-imported', bump);
        return () => window.removeEventListener('labintel-run-history-imported', bump);
    }, []);

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
                let deltaPct = null;
                try {
                    const prevRaw = localStorage.getItem(LS_LAST_SNAPSHOT);
                    if (prevRaw) {
                        const prev = JSON.parse(prevRaw);
                        if (
                            typeof prev.totalTests === 'number' &&
                            prev.totalTests > 0 &&
                            typeof evt.result.totalTests === 'number'
                        ) {
                            deltaPct = ((evt.result.totalTests - prev.totalTests) / prev.totalTests) * 100;
                        }
                    }
                } catch {
                    /* ignore */
                }
                setVsPrevPct(deltaPct);
                try {
                    localStorage.setItem(
                        LS_LAST_SNAPSHOT,
                        JSON.stringify({
                            totalTests: evt.result.totalTests,
                            uniqueSids: evt.result.uniqueSids,
                            completedAt: evt.result.completedAt
                        })
                    );
                } catch {
                    /* ignore */
                }

                setResult(evt.result);
                setLiveTotal(evt.result.totalTests);
                setLiveSids(evt.result.uniqueSids);
                setLiveBu(null);

                try {
                    const snapshot =
                        typeof structuredClone === 'function'
                            ? structuredClone(evt.result)
                            : JSON.parse(JSON.stringify(evt.result));
                    const record = {
                        id:
                            typeof crypto !== 'undefined' && crypto.randomUUID
                                ? crypto.randomUUID()
                                : `run-${Date.now()}`,
                        savedAt: new Date().toISOString(),
                        result: snapshot,
                        source: 'dashboard'
                    };
                    void appendRunRecord(record)
                        .then(() => setRunHistoryVersion((v) => v + 1))
                        .catch((err) => {
                            appendLog(`Warning: could not save run to Reports history (${err?.message || err})`);
                        });
                } catch (err) {
                    appendLog(`Warning: could not save run to Reports history (${err?.message || err})`);
                }

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
        setVsPrevPct(null);
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

    const aggregate = useMemo(() => {
        if (!buSummaryRows.length) return null;
        return {
            samples: buSummaryRows.reduce((s, r) => s + r.totalTests, 0),
            sids: buSummaryRows.reduce((s, r) => s + r.uniqueSids, 0)
        };
    }, [buSummaryRows]);

    const totalDisplay = liveTotal ?? result?.totalTests;
    const sidsDisplay = liveSids ?? result?.uniqueSids;

    const assignedBu = useMemo(() => {
        if (result?.multiBu && result.businessUnits?.length) return result.businessUnits.join(', ');
        if (result?.businessUnit) return result.businessUnit;
        if (liveBu) return liveBu;
        if (selectedBuList.length) return selectedBuList.join(', ');
        return '—';
    }, [result, liveBu, selectedBuList]);

    const unitRatioLabel = useMemo(() => {
        if (totalDisplay == null || sidsDisplay == null) return null;
        const u = Number(sidsDisplay);
        const t = Number(totalDisplay);
        if (!Number.isFinite(u) || !Number.isFinite(t) || u < 1) return null;
        return `1 : ${(t / u).toFixed(1)}`;
    }, [totalDisplay, sidsDisplay]);

    const handleShare = useCallback(async () => {
        const lines = [
            'Stellar Shark — Daily test volume',
            `Total samples: ${totalDisplay ?? '—'}`,
            `Unique SIDs: ${sidsDisplay ?? '—'}`,
            `Assigned BU: ${assignedBu}`,
            `Test code: ${(result?.testCode ?? testCode).trim() || '—'}`,
            `Range: ${dateFrom} → ${dateTo}`
        ];
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
        } catch {
            /* ignore */
        }
    }, [totalDisplay, sidsDisplay, assignedBu, result?.testCode, testCode, dateFrom, dateTo]);

    const handleDownload = useCallback(() => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `lab-run-${result.completedAt?.slice(0, 10) || 'result'}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }, [result]);

    const primaryQuick = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'week', label: '7d' }
    ];
    const secondaryQuick = [
        { id: 'ereyesterday', label: 'Ereyesterday' },
        { id: 'month', label: 'MTD' },
        { id: 'ytd', label: 'YTD' }
    ];

    return (
        <div className="relative min-h-dvh flex flex-col md:h-dvh md:max-h-dvh md:overflow-hidden text-slate-200">
            <div className="lab-app-bg genomics-bg" aria-hidden />

            <div className="relative z-10 flex flex-1 min-h-0 min-w-0 flex-col md:flex-row">
                <aside className="w-full md:w-[320px] md:shrink-0 border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#070d18] flex flex-col max-h-[55dvh] md:max-h-none overflow-y-auto log-scroll">
                    <div className="p-5 border-b border-white/[0.06]">
                        <h1 className="font-display text-xl font-bold text-white tracking-tight">Stellar Shark</h1>
                        <p className="text-xs text-slate-500 mt-1">Clinical Architect</p>
                        <p className="text-[10px] font-mono text-slate-600 mt-0.5">v2.4.0-Alpha</p>
                    </div>

                    <div className="p-5 space-y-6 flex-1 flex flex-col">
                        <section>
                            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                Timeframe
                            </h2>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-500 mb-1 block" htmlFor="date-from">
                                        From
                                    </label>
                                    <input
                                        id="date-from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        disabled={running}
                                        className="lab-input text-xs py-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 mb-1 block" htmlFor="date-to">
                                        To
                                    </label>
                                    <input
                                        id="date-to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        disabled={running}
                                        className="lab-input text-xs py-2"
                                    />
                                </div>
                            </div>
                            {rangeInvalid && (
                                <p className="text-rose-400 text-[10px] mt-2">From must be ≤ To.</p>
                            )}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {primaryQuick.map(({ id, label }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        disabled={running}
                                        onClick={() => applyPreset(id)}
                                        className="px-2.5 py-1.5 rounded-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5 hover:border-white/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {secondaryQuick.map(({ id, label }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        disabled={running}
                                        onClick={() => applyPreset(id)}
                                        className="px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </section>

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
                            variant="sidebar"
                        />

                        <TestCodePresets
                            testCode={testCode}
                            setTestCode={setTestCode}
                            running={running}
                            sidebar
                        />

                        <div className="mt-auto pt-2 space-y-2">
                            <motion.button
                                type="button"
                                onClick={run}
                                disabled={running || rangeInvalid || noBuSelected}
                                whileHover={{ scale: reduceMotion || running ? 1 : 1.01 }}
                                whileTap={{ scale: reduceMotion || running ? 1 : 0.99 }}
                                className="btn-lab-run flex items-center justify-center gap-2"
                            >
                                <span className="text-lg leading-none" aria-hidden>
                                    ▶
                                </span>
                                {running ? 'Running analysis…' : 'Run New Analysis'}
                            </motion.button>
                            {running ? (
                                <button
                                    type="button"
                                    onClick={stop}
                                    className="w-full text-center text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 rounded"
                                >
                                    Cancel
                                </button>
                            ) : null}

                            <details className="text-[10px] text-slate-600 pt-2 border-t border-white/[0.06] group">
                                <summary className="cursor-pointer text-slate-500 hover:text-slate-400 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                                    <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                                    Advanced
                                </summary>
                                <label className="flex items-center gap-2 cursor-pointer mt-2 text-slate-500">
                                    <input
                                        type="checkbox"
                                        checked={!headless}
                                        onChange={(e) => setHeadless(!e.target.checked)}
                                        disabled={running}
                                        className="w-3.5 h-3.5 rounded border-slate-600"
                                    />
                                    Headed browser (debug)
                                </label>
                                <p className="mt-2 leading-relaxed pl-1 border-l border-white/10">
                                    <code className="text-sky-500/90">LIS_*</code> or{' '}
                                    <code className="text-sky-500/90">CBC_LOGIN_*</code> in{' '}
                                    <code className="text-sky-500/90">.env</code>. Dev:{' '}
                                    <code className="text-sky-500/90">npm run dev</code>
                                </p>
                            </details>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 min-w-0 flex flex-col overflow-hidden p-4 md:p-6 lg:p-8">
                    <LabTopNav
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onShare={handleShare}
                        onDownload={handleDownload}
                    />

                    {activeTab === 'dashboard' ? (
                        <>
                            <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                                        Daily test volume
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Genomics · LIS · Precision Diagnostic Analytics
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {running ? (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/40 bg-sky-500/10 text-[10px] font-bold uppercase tracking-widest text-sky-300">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                                            </span>
                                            Live monitor
                                        </span>
                                    ) : null}
                                </div>
                            </header>

                            {error ? (
                                <p className="mb-4 text-sm text-rose-400 border border-rose-500/30 rounded-lg px-3 py-2 bg-rose-950/20">
                                    {error}
                                </p>
                            ) : null}

                            <div className="flex-1 min-h-0 overflow-y-auto log-scroll space-y-4 pr-1">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    <LabStatHero
                                        totalDisplay={totalDisplay}
                                        vsPrevPct={vsPrevPct}
                                        durationMs={result?.durationMs}
                                        testCode={result?.testCode != null ? result.testCode : testCode}
                                        assignedBu={assignedBu}
                                        unitRatioLabel={unitRatioLabel}
                                        running={running}
                                    />
                                    <LabActivityPanel log={log} />
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                                    <LabSidsPanel result={result} />
                                    <div className="lab-card">
                                        <h3 className="text-sm font-semibold text-white mb-3">Per business unit</h3>
                                        <BuSummaryTable
                                            rows={buSummaryRows}
                                            variant="lab"
                                            aggregate={aggregate}
                                            maxClass="max-h-48 mb-0"
                                        />
                                        <details className="mt-4 group">
                                            <summary className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                                                <span className="group-open:rotate-90 transition-transform inline-block">
                                                    ▸
                                                </span>
                                                Grid scan (technical)
                                            </summary>
                                            <div className="mt-3">
                                                <GridScanTable rows={perStatusRows} maxClass="max-h-40" />
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'reports' ? (
                        <div className="flex-1 min-h-0 overflow-y-auto log-scroll pr-1">
                            <LabReportsView refreshKey={runHistoryVersion} />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto log-scroll pr-1">
                            <LabSchedulerView />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
