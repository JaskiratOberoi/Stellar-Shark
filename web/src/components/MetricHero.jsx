import { motion, AnimatePresence } from 'framer-motion';

export function MetricHero({ liveTotal, liveSids, liveBu, liveStatus, multiBu, running, compact = false }) {
    const numCls = compact
        ? 'font-display text-4xl sm:text-5xl font-bold text-white tabular-nums mt-0.5 leading-none'
        : 'font-display text-5xl md:text-7xl font-bold text-white tabular-nums mt-1';
    const labelCls = compact
        ? 'text-indigo-200/85 text-[10px] sm:text-xs font-medium uppercase tracking-wider'
        : 'text-indigo-200/85 text-sm font-medium uppercase tracking-wider';
    const sideCls = compact
        ? 'text-right text-[10px] sm:text-xs text-genomics-fg-muted space-y-0.5'
        : 'text-right text-sm text-genomics-fg-muted space-y-1';

    return (
        <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between ${compact ? 'gap-2 mb-1' : 'gap-4 mb-2'}`}>
            <div className="min-w-0">
                <p className={labelCls}>{multiBu ? 'Total samples (selected BUs)' : 'Total samples'}</p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={liveTotal ?? 'empty'}
                        initial={{ opacity: 0, y: compact ? 6 : 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: compact ? -6 : -12 }}
                        className={numCls}
                    >
                        {liveTotal != null ? liveTotal : '—'}
                    </motion.p>
                </AnimatePresence>
            </div>
            <div className={sideCls}>
                <p>
                    SIDs: <span className="text-genomics-success tabular-nums">{liveSids ?? '—'}</span>
                </p>
                <p>
                    BU: <span className="text-amber-200/90">{liveBu || (running ? '…' : '—')}</span>
                </p>
                <p>
                    Status: <span className="text-fuchsia-300/95">{liveStatus || (running ? '…' : '—')}</span>
                </p>
            </div>
        </div>
    );
}
