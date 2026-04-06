export function TopStatusBar({ running, result }) {
    let label = 'Ready';
    let className = 'text-genomics-fg-subtle';
    if (running) {
        label = 'Running…';
        className = 'text-cyan-300';
    } else if (result) {
        label = 'Last run complete';
        className = 'text-emerald-300/90';
    }

    return (
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b border-white/[0.08]">
            <div>
                <p className="text-[11px] font-medium tracking-[0.18em] text-indigo-300/85 uppercase">Genomics · LIS</p>
                <p className="font-display text-xl md:text-2xl text-white font-semibold tracking-tight">Worksheet counter</p>
            </div>
            <div
                className={`text-sm font-medium tabular-nums px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] ${className}`}
                role="status"
                aria-live="polite"
            >
                {label}
            </div>
        </header>
    );
}
