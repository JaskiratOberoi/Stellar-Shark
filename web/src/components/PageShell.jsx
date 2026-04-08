/**
 * Shared CRM-style page wrapper: grid background, consistent padding and header.
 * Used by admin and lab routes for visual parity with the Nexus design system.
 */
export function PageShell({
    badge,
    badgeIcon: BadgeIcon,
    title,
    description,
    headerAction,
    error,
    success,
    maxWidthClass = 'max-w-6xl',
    children
}) {
    return (
        <div className="relative min-h-full">
            <div className="lab-app-bg genomics-bg" aria-hidden />
            <div className={`relative z-10 p-4 md:p-8 lg:p-10 ${maxWidthClass} mx-auto space-y-8 pb-16`}>
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                        {badge ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-muted shadow-sm">
                                {BadgeIcon ? (
                                    <BadgeIcon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
                                ) : null}
                                {badge}
                            </div>
                        ) : null}
                        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight">
                            {title}
                        </h1>
                        {description ? (
                            <p className="text-sm text-ink-secondary max-w-2xl">{description}</p>
                        ) : null}
                    </div>
                    {headerAction ? (
                        <div className="shrink-0 flex flex-wrap gap-2 justify-end">{headerAction}</div>
                    ) : null}
                </header>

                {error ? (
                    <p
                        className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-xl px-4 py-3"
                        role="alert"
                    >
                        {error}
                    </p>
                ) : null}
                {success ? (
                    <p className="text-sm text-success bg-success-soft border border-success/25 rounded-xl px-4 py-3">
                        {success}
                    </p>
                ) : null}

                {children}
            </div>
        </div>
    );
}

/**
 * Table inside a card with a toolbar row (title + optional total count).
 */
export function DataTableShell({ title, count, children, className = '', bodyClassName = '' }) {
    return (
        <section className={`lab-card overflow-hidden p-0 shadow-card ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-muted/80 px-5 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
                {count != null ? (
                    <span className="text-xs text-ink-muted tabular-nums">{count} total</span>
                ) : null}
            </div>
            <div className={`overflow-x-auto ${bodyClassName}`}>{children}</div>
        </section>
    );
}
