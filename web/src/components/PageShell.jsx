import { motion, useReducedMotion } from 'framer-motion';
import { SectionMarker } from './nexus/SectionMarker.jsx';
import { HairlineRule } from './nexus/HairlineRule.jsx';

/**
 * Editorial page wrapper used by admin and lab routes.
 * - Hairline grid background
 * - Numbered eyebrow + oversized display title
 * - Animated draw-in rule beneath the header
 * - Asymmetric grid for description / action
 */
export function PageShell({
    badge,
    badgeIcon: BadgeIcon,
    sectionNumber,
    title,
    description,
    headerAction,
    error,
    success,
    maxWidthClass = 'max-w-6xl',
    children
}) {
    const reduce = useReducedMotion();
    const enterY = reduce ? 0 : 8;

    return (
        <div className="relative min-h-full bg-bg text-ink">
            <div className="nexus-bg" aria-hidden />
            <div className={`relative z-10 px-4 md:px-8 lg:px-12 py-8 md:py-12 ${maxWidthClass} mx-auto pb-24`}>
                <header className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="space-y-3 min-w-0">
                        {badge ? (
                            <SectionMarker number={sectionNumber} label={badge} />
                        ) : (
                            <SectionMarker label="Module" />
                        )}
                        <motion.h1
                            initial={{ opacity: 0, y: enterY }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
                            className="font-display font-bold text-display-2 md:text-display-1 text-ink leading-[0.95] tracking-[-0.03em]"
                        >
                            {title}
                        </motion.h1>
                        {description ? (
                            <p className="text-base text-ink-2 max-w-2xl leading-relaxed">{description}</p>
                        ) : null}
                    </div>
                    {headerAction ? (
                        <div className="shrink-0 flex flex-wrap gap-2 sm:justify-end">{headerAction}</div>
                    ) : null}
                </header>

                <div className="mt-6">
                    <HairlineRule />
                </div>

                {error ? (
                    <div
                        className="mt-6 border border-signal-danger bg-signal-danger/10 px-4 py-3"
                        role="alert"
                    >
                        <p className="font-mono uppercase text-eyebrow text-signal-danger mb-1">Error</p>
                        <p className="text-sm text-ink">{error}</p>
                    </div>
                ) : null}
                {success ? (
                    <div className="mt-6 border border-signal-success bg-signal-success/10 px-4 py-3">
                        <p className="font-mono uppercase text-eyebrow text-signal-success mb-1">Success</p>
                        <p className="text-sm text-ink">{success}</p>
                    </div>
                ) : null}

                <motion.div
                    initial={{ opacity: 0, y: enterY }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
                    className="mt-8 space-y-8"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}

/**
 * Editorial table wrapper -- bordered, hairline header, mono toolbar.
 */
export function DataTableShell({ title, count, children, className = '', bodyClassName = '' }) {
    return (
        <section className={`border border-rule-soft bg-surface ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-soft px-5 py-3 bg-surface-2">
                <h2 className="font-mono uppercase text-eyebrow text-ink">{title}</h2>
                {count != null ? (
                    <span className="font-mono text-eyebrow uppercase text-ink-3 num">
                        <span className="text-ink-3">Total</span>{' '}
                        <span className="text-ink">/</span>{' '}
                        <span className="text-ink">{count}</span>
                    </span>
                ) : null}
            </div>
            <div className={`overflow-x-auto ${bodyClassName}`}>{children}</div>
        </section>
    );
}
