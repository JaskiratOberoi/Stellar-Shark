export function BuChipGrid({
    entries,
    buEntryLabel,
    buEntryBadge,
    selectedBu,
    toggleBu,
    selectAllBu,
    clearAllBu,
    running,
    noBuSelected,
    compact = false
}) {
    const mb = compact ? 'mb-3' : 'mb-5';
    const chipMax = compact ? 'max-h-24' : 'max-h-40';
    const labelCls = compact ? 'text-xs text-genomics-fg-muted' : 'text-sm text-genomics-fg-muted';

    return (
        <div className={mb}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className={`block ${labelCls}`}>Business units</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={running}
                        onClick={selectAllBu}
                        className="text-xs text-genomics-accent hover:text-genomics-accent-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas rounded"
                    >
                        All
                    </button>
                    <button
                        type="button"
                        disabled={running}
                        onClick={clearAllBu}
                        className="text-xs text-genomics-fg-subtle hover:text-genomics-fg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas rounded"
                    >
                        Clear
                    </button>
                </div>
            </div>
            {noBuSelected && (
                <p className="text-genomics-warning/95 text-xs mb-2">Select at least one business unit to run.</p>
            )}
            <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'} ${chipMax} overflow-y-auto log-scroll pr-1`}>
                {entries.map((entry) => {
                    const label = buEntryLabel(entry);
                    const badge = buEntryBadge(entry);
                    const on = selectedBu.has(label);
                    const title = badge
                        ? `Lab badge “${badge}” (client-code span.badge)`
                        : label === 'QUGEN'
                          ? 'QUGEN: rows with no lab badge count here (central lab)'
                          : 'Set "badge" in config/businessUnits.json (inspect span.badge in LIS) before running';
                    const chipPad = compact ? 'px-2 py-1 rounded-md text-[11px]' : 'px-3 py-1.5 rounded-lg text-xs';
                    return (
                        <button
                            key={label}
                            type="button"
                            disabled={running}
                            aria-pressed={on}
                            title={title}
                            onClick={() => toggleBu(label)}
                            className={`${chipPad} font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas ${
                                on
                                    ? 'border-genomics-border-strong bg-indigo-600/35 text-white shadow-sm shadow-indigo-950/40'
                                    : 'border-genomics-border text-genomics-fg-muted hover:border-white/20 hover:text-genomics-fg'
                            } disabled:opacity-40`}
                        >
                            <span>{label}</span>
                            {badge ? (
                                <span className="ml-1.5 text-[10px] opacity-80 font-mono">{badge}</span>
                            ) : label === 'QUGEN' ? (
                                <span className="ml-1.5 text-[10px] opacity-70 font-mono">no badge</span>
                            ) : (
                                <span className="ml-1.5 text-[10px] text-genomics-warning/90 font-mono">…</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
