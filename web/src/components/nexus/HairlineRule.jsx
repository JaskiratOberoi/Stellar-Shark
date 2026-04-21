import { motion, useReducedMotion } from 'framer-motion';

/**
 * 1px ink rule that draws in horizontally on mount.
 * Set tone="soft" for a low-contrast separator, "ink" for editorial weight.
 */
export function HairlineRule({ tone = 'ink', delay = 0, className = '' }) {
    const reduce = useReducedMotion();
    const cls = `${tone === 'soft' ? 'bg-rule-soft' : 'bg-ink'} block w-full h-px ${className}`;
    if (reduce) return <span className={cls} />;
    return (
        <motion.span
            className={cls}
            style={{ transformOrigin: 'left center' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay, ease: [0.65, 0, 0.35, 1] }}
        />
    );
}
