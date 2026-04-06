function formatDuration(ms) {
    if (ms == null || !Number.isFinite(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
}

export function LabStatHero({
    totalDisplay,
    vsPrevPct,
    durationMs,
    testCode,
    assignedBu,
    unitRatioLabel,
    running
}) {
    const trend =
        vsPrevPct != null && Number.isFinite(vsPrevPct) ? (
            <span className={`inline-flex items-center gap-1 text-sm ${vsPrevPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    {vsPrevPct >= 0 ? (
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    ) : (
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    )}
                </svg>
                {vsPrevPct >= 0 ? '+' : ''}
                {vsPrevPct.toFixed(0)}% vs. prev run
            </span>
        ) : (
            <span className="text-sm text-slate-500">Run again to compare vs. previous</span>
        );

    const meta = [
        { k: 'Execution', v: running ? '…' : formatDuration(durationMs) },
        { k: 'Test code', v: testCode?.trim() ? testCode.trim() : '—' },
        { k: 'Assigned BU', v: assignedBu || '—' },
        { k: 'Unit ratio', v: unitRatioLabel || '—' }
    ];

    return (
        <div className="lab-card">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Total samples processed</p>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <p className="font-display text-5xl sm:text-6xl font-bold text-white tabular-nums leading-none">
                    {totalDisplay != null ? totalDisplay : '—'}
                </p>
                {trend}
            </div>
            <div className="space-y-2.5 text-xs border-t border-white/10 pt-4">
                {meta.map(({ k, v }) => (
                    <div key={k} className="flex justify-between gap-4">
                        <span className="text-slate-500 uppercase tracking-wide shrink-0">{k}</span>
                        <span className="text-slate-200 font-medium text-right truncate" title={String(v)}>
                            {v}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
