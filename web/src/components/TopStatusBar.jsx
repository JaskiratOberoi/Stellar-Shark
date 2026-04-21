import { SectionMarker } from './nexus/SectionMarker.jsx';

export function TopStatusBar({ running, result, tagline }) {
    let label = 'Ready';
    let tone = 'text-ink-3';
    let dot = 'bg-ink-3';
    if (running) {
        label = 'Running';
        tone = 'text-accent';
        dot = 'bg-accent';
    } else if (result) {
        label = 'Done';
        tone = 'text-signal-success';
        dot = 'bg-signal-success';
    }

    return (
        <header className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 pb-4 mb-4 border-b border-ink">
            <div className="min-w-0 flex-1 space-y-2">
                <SectionMarker number={1} label="Daily test volume" />
                <h1 className="font-display font-bold text-display-2 md:text-display-1 text-ink leading-[0.95] tracking-[-0.03em]">
                    Operations
                </h1>
                <p className="font-mono uppercase text-eyebrow text-ink-3">
                    Nexus <span className="text-ink-3">/</span> Stellar Infomatica{' '}
                    <span className="text-ink-3">/</span> Genomics LIS
                </p>
                {tagline ? (
                    <p className="text-sm text-ink-2 leading-relaxed line-clamp-2 max-w-3xl">
                        {tagline}
                    </p>
                ) : null}
            </div>
            <div
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 border border-rule-soft font-mono uppercase text-eyebrow num ${tone}`}
                role="status"
                aria-live="polite"
            >
                <span className={`block w-1.5 h-1.5 ${dot}`} aria-hidden />
                {label}
            </div>
        </header>
    );
}
