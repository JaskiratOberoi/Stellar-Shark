function formatTime(ts) {
    try {
        return new Date(ts).toLocaleTimeString(undefined, {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return '';
    }
}

export function LabActivityPanel({ log }) {
    return (
        <div className="lab-card min-h-[200px] max-h-[320px]">
            <h3 className="text-sm font-semibold text-ink mb-3">Activity log</h3>
            <div className="flex-1 min-h-0 overflow-y-auto log-scroll font-mono text-[11px] leading-relaxed text-ink-secondary space-y-1 pr-1">
                {log.length === 0 ? (
                    <p className="text-ink-muted">System events appear here when you run an analysis…</p>
                ) : (
                    log.map((entry, i) => (
                        <div key={`${entry.t}-${i}`} className="flex gap-2">
                            <span className="shrink-0 text-primary tabular-nums">{formatTime(entry.t)}</span>
                            <span className="break-words">{entry.line}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
