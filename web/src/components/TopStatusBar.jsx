export function TopStatusBar({ running, result, tagline }) {
    let label = 'Ready';
    let tone = 'text-genomics-fg-subtle';
    if (running) {
        label = 'Running…';
        tone = 'text-cyan-300';
    } else if (result) {
        label = 'Done';
        tone = 'text-emerald-300/90';
    }

    return (
        <header className="shrink-0 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 pb-2 mb-2 border-b border-white/[0.08]">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent leading-tight">
                        Daily test volume
                    </h1>
                    <span className="text-[10px] font-medium tracking-[0.15em] text-indigo-300/80 uppercase whitespace-nowrap">
                        Nexus by Stellar Infomatica · Genomics · LIS
                    </span>
                </div>
                {tagline ? (
                    <p className="mt-1 text-[11px] sm:text-xs text-genomics-fg-muted leading-snug line-clamp-2 sm:line-clamp-2 max-w-4xl">
                        {tagline}
                    </p>
                ) : null}
            </div>
            <div
                className={`shrink-0 text-xs sm:text-sm font-medium tabular-nums px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10 bg-white/[0.04] ${tone}`}
                role="status"
                aria-live="polite"
            >
                {label}
            </div>
        </header>
    );
}
