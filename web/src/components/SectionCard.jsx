export function SectionCard({ title, description, children, variant = 'control', className = '' }) {
    const panel = variant === 'emphasis' ? 'glass-panel-emphasis' : 'glass-panel';
    const pad = variant === 'emphasis' ? 'p-6 md:p-10' : 'p-5 md:p-6';
    return (
        <div className={`${panel} ${pad} ${className}`}>
            {title ? <h2 className="font-display font-semibold text-lg text-white mb-1">{title}</h2> : null}
            {description ? <p className="text-xs text-genomics-fg-subtle mb-4 leading-relaxed">{description}</p> : null}
            {children}
        </div>
    );
}
