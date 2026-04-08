import { useMemo, useState } from 'react';
import { DEFAULT_VISIBLE_BU_LABELS } from '../dashboardDefaults.js';

const DEFAULT_BU_SET = new Set(DEFAULT_VISIBLE_BU_LABELS);

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
    compact = false,
    variant = 'default'
}) {
    const [showAllBu, setShowAllBu] = useState(false);

    const visibleEntries = useMemo(() => {
        if (showAllBu) return entries;
        return entries.filter((entry) => {
            const label = buEntryLabel(entry);
            if (DEFAULT_BU_SET.has(label)) return true;
            if (selectedBu.has(label)) return true;
            return false;
        });
    }, [entries, showAllBu, selectedBu, buEntryLabel]);

    const isSidebar = variant === 'sidebar';
    const mb = compact || isSidebar ? 'mb-3' : 'mb-5';
    const chipMax = isSidebar ? 'max-h-none' : compact ? 'max-h-24' : 'max-h-40';
    const labelCls = isSidebar
        ? 'text-[10px] font-semibold uppercase tracking-wider text-slate-500'
        : compact
          ? 'text-xs text-genomics-fg-muted'
          : 'text-sm text-genomics-fg-muted';

    const onSelectAll = () => {
        setShowAllBu(true);
        selectAllBu();
    };

    return (
        <div className={mb}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className={`block ${labelCls}`}>{isSidebar ? 'Business units' : 'Business units'}</label>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <button
                        type="button"
                        disabled={running}
                        onClick={() => setShowAllBu((v) => !v)}
                        className={`text-[10px] uppercase tracking-wide disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 rounded ${
                            isSidebar
                                ? 'text-primary hover:text-primary-hover focus-visible:ring-primary/30'
                                : 'text-xs text-genomics-accent hover:text-genomics-accent-hover focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas'
                        }`}
                        aria-expanded={showAllBu}
                    >
                        {showAllBu ? 'Show fewer BUs' : 'Show all BUs'}
                    </button>
                    <button
                        type="button"
                        disabled={running}
                        onClick={onSelectAll}
                        className={`disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 rounded ${
                            isSidebar
                                ? 'text-[10px] uppercase tracking-wide text-primary hover:text-primary-hover focus-visible:ring-primary/30'
                                : 'text-xs text-genomics-accent hover:text-genomics-accent-hover focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas'
                        }`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        disabled={running}
                        onClick={clearAllBu}
                        className={`disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 rounded ${
                            isSidebar
                                ? 'text-[10px] uppercase tracking-wide text-ink-muted hover:text-ink-secondary focus-visible:ring-primary/30'
                                : 'text-xs text-genomics-fg-subtle hover:text-genomics-fg-muted focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas'
                        }`}
                    >
                        Clear
                    </button>
                </div>
            </div>
            {noBuSelected && (
                <p className={`text-amber-400/95 mb-2 ${isSidebar ? 'text-[10px]' : 'text-xs'}`}>
                    Select at least one business unit to run.
                </p>
            )}
            <div
                className={`flex flex-wrap ${isSidebar ? 'gap-2' : compact ? 'gap-1.5' : 'gap-2'} ${chipMax} overflow-y-auto log-scroll pr-1`}
            >
                {visibleEntries.map((entry) => {
                    const label = buEntryLabel(entry);
                    const badge = buEntryBadge(entry);
                    const on = selectedBu.has(label);
                    const title = badge
                        ? `Lab badge “${badge}” (client-code span.badge)`
                        : label === 'QUGEN'
                          ? 'QUGEN: rows with no lab badge count here (central lab)'
                          : 'Set "badge" in config/businessUnits.json (inspect span.badge in LIS) before running';
                    const chipPad = isSidebar
                        ? 'px-3 py-2.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide min-w-[5.5rem] justify-center'
                        : compact
                          ? 'px-2 py-1 rounded-md text-[11px]'
                          : 'px-3 py-1.5 rounded-lg text-xs';
                    /* Sidebar sits on light bg (e.g. bg-white); selected must stay readable — never white-on-white. */
                    const selectedCls = isSidebar
                        ? on
                            ? 'border-primary bg-primary text-white shadow-sm ring-1 ring-primary/25'
                            : 'border-border text-ink-secondary bg-white hover:bg-surface-muted hover:border-border-strong'
                        : on
                          ? 'border-genomics-border-strong bg-indigo-600/35 text-white shadow-sm shadow-indigo-950/40'
                          : 'border-genomics-border text-genomics-fg-muted hover:border-white/20 hover:text-genomics-fg';
                    const focusRing = isSidebar
                        ? 'focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                        : 'focus-visible:ring-cyan-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d18]';
                    return (
                        <button
                            key={label}
                            type="button"
                            disabled={running}
                            aria-pressed={on}
                            title={title}
                            onClick={() => toggleBu(label)}
                            className={`${chipPad} inline-flex items-center font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 ${focusRing} ${selectedCls} disabled:opacity-40`}
                        >
                            <span>{isSidebar ? label.toUpperCase() : label}</span>
                            {!isSidebar && badge ? (
                                <span className="ml-1.5 text-[10px] opacity-80 font-mono">{badge}</span>
                            ) : !isSidebar && label === 'QUGEN' ? (
                                <span className="ml-1.5 text-[10px] opacity-70 font-mono">no badge</span>
                            ) : !isSidebar && !badge && label !== 'QUGEN' ? (
                                <span className="ml-1.5 text-[10px] text-genomics-warning/90 font-mono">…</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
