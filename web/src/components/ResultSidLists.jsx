import { useCallback, useState } from 'react';

function SidBlock({ title, sids, legacyHint }) {
    const list = Array.isArray(sids) ? sids : [];
    const [copied, setCopied] = useState(false);

    const copyAll = useCallback(async () => {
        if (list.length === 0) return;
        try {
            await navigator.clipboard.writeText(list.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    }, [list]);

    if (legacyHint) {
        return (
            <p className="font-mono text-eyebrow uppercase text-signal-warning leading-snug mt-2 pt-2 border-t border-rule-soft">
                Re-run the count to load the full SID list.
            </p>
        );
    }

    if (list.length === 0) {
        return (
            <p className="font-mono text-eyebrow uppercase text-ink-3 mt-2 pt-2 border-t border-rule-soft">
                No matching SIDs in this run.
            </p>
        );
    }

    return (
        <div className="mt-2 pt-2 border-t border-rule-soft flex flex-col min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <h3 className="font-mono text-eyebrow uppercase text-ink">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-eyebrow uppercase text-ink-3 num">
                        {list.length} SIDs
                    </span>
                    <button
                        type="button"
                        onClick={copyAll}
                        className="font-mono text-eyebrow uppercase px-2 py-0.5 border border-rule-soft text-ink hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150 ease-snap"
                    >
                        {copied ? 'Copied' : 'Copy all'}
                    </button>
                </div>
            </div>
            <ul className="log-scroll max-h-40 overflow-y-auto border border-rule-soft bg-surface-2 px-2 py-1.5 font-mono text-[11px] leading-snug text-ink-2 space-y-0.5">
                {list.map((sid, i) => (
                    <li key={`${sid}-${i}`} className="break-all">
                        {sid}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Renders counted SIDs from a completed run (single- or multi-BU). */
export function ResultSidLists({ result }) {
    if (!result) return null;

    if (result.multiBu && Array.isArray(result.results)) {
        return (
            <div className="space-y-1">
                <p className="font-mono text-eyebrow uppercase text-ink-3 leading-snug">SIDs per business unit (not deduped across BUs).</p>
                {result.results.map((r) => {
                    const legacy =
                        r.sidList === undefined && (r.totalTests > 0 || r.uniqueSids > 0);
                    return (
                        <SidBlock
                            key={r.businessUnit}
                            title={r.businessUnit}
                            sids={r.sidList}
                            legacyHint={legacy}
                        />
                    );
                })}
            </div>
        );
    }

    const legacy = result.sidList === undefined && (result.totalTests > 0 || result.uniqueSids > 0);
    return (
        <SidBlock title="Sample IDs (SIDs)" sids={result.sidList} legacyHint={legacy} />
    );
}
