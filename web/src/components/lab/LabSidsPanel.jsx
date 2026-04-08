import { useCallback, useState } from 'react';

function CopyAllButton({ onCopy, copied }) {
    return (
        <button
            type="button"
            onClick={onCopy}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded px-1 shrink-0"
        >
            {copied ? 'Copied' : 'Copy all'}
        </button>
    );
}

function SidGrid({ title, sids, legacyHint, showCopyButton = true }) {
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
            <p className="text-[11px] text-warning">Re-run the analysis to load the full SID list.</p>
        );
    }

    if (list.length === 0) {
        return <p className="text-[11px] text-ink-muted">No sample IDs for this run.</p>;
    }

    const copyBtn = showCopyButton ? <CopyAllButton onCopy={copyAll} copied={copied} /> : null;

    return (
        <div>
            {title ? (
                <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
                    {copyBtn}
                </div>
            ) : showCopyButton ? (
                <div className="flex items-center justify-end mb-2">{copyBtn}</div>
            ) : null}
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-ink-secondary tabular-nums">
                {list.map((sid, i) => (
                    <li key={`${sid}-${i}`} className="border-b border-border py-1">
                        {sid}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function LabSidsPanel({ result }) {
    if (!result) {
        return (
            <div className="lab-card min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-ink">Sample IDs (SIDs)</h3>
                </div>
                <p className="text-[11px] text-ink-muted">Run an analysis to list SIDs.</p>
            </div>
        );
    }

    if (result.multiBu && Array.isArray(result.results)) {
        return (
            <div className="lab-card min-h-[200px] max-h-[360px] overflow-y-auto log-scroll">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-ink">Sample IDs (SIDs)</h3>
                </div>
                <p className="text-[10px] text-ink-muted mb-4">Per business unit (not deduped across BUs).</p>
                <div className="space-y-6">
                    {result.results.map((r) => {
                        const legacy =
                            r.sidList === undefined && (r.totalTests > 0 || r.uniqueSids > 0);
                        return (
                            <SidGrid
                                key={r.businessUnit}
                                title={r.businessUnit}
                                sids={r.sidList}
                                legacyHint={legacy}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    const legacy = result.sidList === undefined && (result.totalTests > 0 || result.uniqueSids > 0);

    return (
        <LabSidsSingleCard sids={result.sidList} legacyHint={legacy} />
    );
}

function LabSidsSingleCard({ sids, legacyHint }) {
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

    return (
        <div className="lab-card min-h-[200px] max-h-[360px] flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                <h3 className="text-sm font-semibold text-ink">Sample IDs (SIDs)</h3>
                {list.length > 0 && !legacyHint ? (
                    <CopyAllButton onCopy={copyAll} copied={copied} />
                ) : null}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto log-scroll pr-1">
                <SidGrid title={null} sids={sids} legacyHint={legacyHint} showCopyButton={false} />
            </div>
        </div>
    );
}
