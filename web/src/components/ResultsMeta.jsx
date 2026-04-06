import { motion } from 'framer-motion';

function formatDuration(ms) {
    if (ms == null || !Number.isFinite(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
}

export function ResultsMeta({ result, compact = false }) {
    if (!result) return null;

    const wrapCls = compact
        ? 'mt-2 pt-2 border-t border-white/10 text-[11px] sm:text-xs text-genomics-fg-muted flex flex-wrap gap-x-3 gap-y-1'
        : 'mt-6 pt-6 border-t border-white/10 text-sm text-genomics-fg-muted flex flex-wrap gap-x-6 gap-y-2';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={wrapCls}>
            <span>
                Finished:{' '}
                <span className="text-genomics-fg">{new Date(result.completedAt).toLocaleString()}</span>
            </span>
            <span>
                Duration: <span className="text-genomics-fg">{formatDuration(result.durationMs)}</span>
            </span>
            <span>
                Range:{' '}
                <span className="text-genomics-fg">
                    {result.dateFrom && result.dateTo
                        ? result.dateFrom === result.dateTo
                            ? result.dateFrom
                            : `${result.dateFrom} → ${result.dateTo}`
                        : result.date ?? '—'}
                </span>
            </span>
            {result.testCode ? (
                <span>
                    Test code: <span className="text-genomics-fg font-mono">{result.testCode}</span>
                </span>
            ) : null}
            {result.multiBu && result.businessUnits?.length ? (
                <span>
                    BUs: <span className="text-genomics-fg">{result.businessUnits.join(', ')}</span>
                </span>
            ) : result.businessUnit ? (
                <span>
                    BU: <span className="text-genomics-fg">{result.businessUnit}</span>
                </span>
            ) : null}
            {result.labBadge ? (
                <span>
                    Lab badge: <span className="text-genomics-fg font-mono">{result.labBadge}</span>
                </span>
            ) : null}
        </motion.div>
    );
}
