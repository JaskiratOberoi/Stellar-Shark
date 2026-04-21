import { CornerBrackets } from './nexus/CornerBrackets.jsx';

/**
 * Editorial section card. Solid, bordered, hairline-divided.
 *
 * variant:
 *   - 'control'  (default) -- standard card
 *   - 'emphasis'           -- thicker ink border + accent corner brackets
 */
export function SectionCard({
    title,
    description,
    children,
    footer,
    variant = 'control',
    className = '',
    bodyClassName = '',
    dense = false,
    scrollBody = false
}) {
    const isEmphasis = variant === 'emphasis';
    const pad = dense ? 'p-3 sm:p-4' : isEmphasis ? 'p-6 md:p-8' : 'p-5 md:p-6';
    const titleCls = dense
        ? 'font-display text-base font-semibold text-ink'
        : 'font-display text-lg md:text-xl font-semibold text-ink';
    const descCls = dense
        ? 'font-mono uppercase text-eyebrow text-ink-3 mt-0.5'
        : 'text-sm text-ink-2 mt-1 leading-relaxed';

    const flexShell = scrollBody || footer;
    const borderCls = isEmphasis ? 'border-2 border-ink' : 'border border-rule-soft';
    const shell = `relative group bg-surface ${borderCls} ${pad} ${className} ${
        flexShell ? 'flex flex-col min-h-0 overflow-hidden' : ''
    }`.trim();

    return (
        <div className={shell}>
            {isEmphasis ? <CornerBrackets tone="accent" /> : null}
            {title || description ? (
                <div className="shrink-0 mb-4">
                    {title ? <h2 className={titleCls}>{title}</h2> : null}
                    {description ? <p className={descCls}>{description}</p> : null}
                </div>
            ) : null}
            <div
                className={
                    scrollBody
                        ? `flex-1 min-h-0 overflow-y-auto log-scroll ${bodyClassName}`.trim()
                        : bodyClassName || undefined
                }
            >
                {children}
            </div>
            {footer ? (
                <div
                    className={`shrink-0 mt-4 pt-4 border-t border-rule-soft ${dense ? 'mt-2 pt-2' : ''}`}
                >
                    {footer}
                </div>
            ) : null}
        </div>
    );
}
