import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Editorial hero metric -- giant tabular numerals with per-mount tick animation.
 * Treats the number as type, not data.
 */
export function MetricHero({ liveTotal, liveSids, liveBu, liveStatus, multiBu, running, compact = false }) {
    const reduce = useReducedMotion();
    const numCls = compact
        ? 'font-display font-bold text-5xl sm:text-6xl text-ink num leading-[0.9] tracking-[-0.04em]'
        : 'font-display font-bold text-display-1 md:text-display-hero text-ink num leading-[0.9] tracking-[-0.04em]';
    const labelCls = 'font-mono uppercase text-eyebrow text-ink-3';
    const value = liveTotal != null ? liveTotal : '—';

    return (
        <div
            className={`relative grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end border-b border-rule-soft pb-4 ${
                compact ? '' : 'pb-6'
            }`}
        >
            <div className="min-w-0">
                <p className={labelCls}>
                    {multiBu ? 'Total samples / selected BUs' : 'Total samples'}
                </p>
                <AnimatePresence mode="wait">
                    {reduce ? (
                        <p key={value} className={numCls}>
                            {value}
                        </p>
                    ) : (
                        <motion.p
                            key={value}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
                            className={`mt-2 ${numCls}`}
                        >
                            {value}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
            <dl className="grid grid-cols-3 sm:flex sm:flex-col sm:items-end sm:text-right gap-3 sm:gap-1.5 font-mono text-eyebrow uppercase">
                <div>
                    <dt className="text-ink-3">SIDs</dt>
                    <dd className="text-ink num text-sm">{liveSids ?? '—'}</dd>
                </div>
                <div>
                    <dt className="text-ink-3">BU</dt>
                    <dd className="text-ink text-sm">{liveBu || (running ? '…' : '—')}</dd>
                </div>
                <div>
                    <dt className="text-ink-3">Status</dt>
                    <dd className="text-accent text-sm">{liveStatus || (running ? '…' : '—')}</dd>
                </div>
            </dl>
        </div>
    );
}
