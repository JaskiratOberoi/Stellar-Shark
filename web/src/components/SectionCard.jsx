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
    const panel = variant === 'emphasis' ? 'glass-panel-emphasis' : 'glass-panel';
    const pad = dense
        ? variant === 'emphasis'
            ? 'p-3 sm:p-4'
            : 'p-3 sm:p-4'
        : variant === 'emphasis'
          ? 'p-6 md:p-10'
          : 'p-5 md:p-6';
    const titleCls = dense ? 'text-sm sm:text-base font-semibold mb-0.5' : 'text-lg mb-1';
    const descCls = dense ? 'text-[10px] mb-2 leading-snug' : 'text-xs mb-4 leading-relaxed';

    const flexShell = scrollBody || footer;
    const shell = flexShell
        ? `${panel} ${pad} ${className} flex flex-col min-h-0 overflow-hidden`.trim()
        : `${panel} ${pad} ${className}`;

    return (
        <div className={shell}>
            {title || description ? (
                <div className="shrink-0">
                    {title ? (
                        <h2 className={`font-display text-white ${titleCls}`}>{title}</h2>
                    ) : null}
                    {description ? (
                        <p className={`text-genomics-fg-subtle ${descCls}`}>{description}</p>
                    ) : null}
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
                <div className={`shrink-0 ${dense ? 'mt-2 pt-2 border-t border-white/10' : 'mt-4 pt-4 border-t border-white/10'}`}>
                    {footer}
                </div>
            ) : null}
        </div>
    );
}
