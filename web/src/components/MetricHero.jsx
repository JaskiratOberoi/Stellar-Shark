import { motion, AnimatePresence } from 'framer-motion';

export function MetricHero({ liveTotal, liveSids, liveBu, liveStatus, multiBu, running }) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
            <div>
                <p className="text-indigo-200/85 text-sm font-medium uppercase tracking-wider">
                    {multiBu ? 'Total samples (selected BUs)' : 'Total samples'}
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
            <div className="text-right text-sm text-genomics-fg-muted space-y-1">
                <p>
                    Unique SIDs (badge-matched):{' '}
                    <span className="text-genomics-success tabular-nums">{liveSids ?? '—'}</span>
                </p>
                <p>
                    Current BU:{' '}
                    <span className="text-amber-200/90">{liveBu || (running ? '…' : '—')}</span>
                </p>
                <p>
                    Status:{' '}
                    <span className="text-fuchsia-300/95">{liveStatus || (running ? '…' : '—')}</span>
                </p>
            </div>
        </div>
    );
}
