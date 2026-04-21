import { NexusMark } from './NexusMark.jsx';

/**
 * Editorial Nexus wordmark with optional tagline.
 * Variants:
 *   - 'inline' (default) -- mark + NEXUS, optional /STELLAR INFOMATICA mono tagline
 *   - 'stack'           -- mark above NEXUS over a tagline (for hero use)
 *   - 'mark-only'       -- just the geometric mark
 */
export function NexusWordmark({
    variant = 'inline',
    showTagline = false,
    size = 'md',
    animate = false,
    loop = 0,
    className = ''
}) {
    if (variant === 'mark-only') {
        const px = size === 'lg' ? 56 : size === 'sm' ? 24 : 32;
        return <NexusMark size={px} animate={animate} loop={loop} className={className} />;
    }

    const wordSize =
        size === 'lg'
            ? 'text-display-1'
            : size === 'sm'
              ? 'text-base'
              : 'text-xl';
    const markSize = size === 'lg' ? 56 : size === 'sm' ? 18 : 24;

    if (variant === 'stack') {
        return (
            <div className={`flex flex-col items-start gap-3 ${className}`}>
                <NexusMark size={markSize * 1.6} animate={animate} loop={loop} />
                <div>
                    <p className={`font-display font-bold tracking-tight text-ink leading-none ${wordSize}`}>
                        NEXUS
                    </p>
                    {showTagline ? (
                        <p className="mt-2 font-mono uppercase text-eyebrow text-ink-2">
                            / Stellar Infomatica
                        </p>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <NexusMark size={markSize} animate={animate} loop={loop} />
            <span className={`font-display font-bold tracking-tight text-ink leading-none ${wordSize}`}>
                NEXUS
            </span>
            {showTagline ? (
                <span className="hidden md:inline font-mono uppercase text-eyebrow text-ink-3 ml-2 border-l border-rule-soft pl-3">
                    Stellar Infomatica
                </span>
            ) : null}
        </span>
    );
}
