/**
 * Editorial marquee ticker. Repeats children twice for a seamless loop.
 *
 * Usage:
 *   <Ticker>
 *     <TickerItem>SYS / OK</TickerItem>
 *     <TickerItem>BU / QUGEN</TickerItem>
 *   </Ticker>
 */
export function Ticker({ children, className = '' }) {
    return (
        <div
            className={`relative overflow-hidden border-y border-rule-soft bg-surface nexus-marquee-pause ${className}`}
            role="status"
            aria-live="off"
        >
            <div className="nexus-marquee py-2 pl-6 font-mono text-eyebrow text-ink-2">
                <div className="flex gap-12 whitespace-nowrap shrink-0">{children}</div>
                <div className="flex gap-12 whitespace-nowrap shrink-0" aria-hidden>
                    {children}
                </div>
            </div>
        </div>
    );
}

export function TickerItem({ label, value, tone = 'default' }) {
    const valTone =
        tone === 'success'
            ? 'text-signal-success'
            : tone === 'danger'
              ? 'text-signal-danger'
              : tone === 'warning'
                ? 'text-signal-warning'
                : tone === 'accent'
                  ? 'text-accent'
                  : 'text-ink';
    return (
        <span className="inline-flex items-center gap-2">
            <span className="text-ink-3">{label}</span>
            <span className="text-ink-3">/</span>
            <span className={`${valTone} num`}>{value}</span>
        </span>
    );
}
