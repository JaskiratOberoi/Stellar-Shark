import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Nexus geometric mark: a square frame containing a Space Grotesk "N"
 * (the same display face used by the NEXUS wordmark, for type-system
 * consistency) plus an electric-accent square in the top-right corner
 * as the brand signature.
 *
 * Animation modes:
 *   - animate=false (default): renders statically, no motion mounted.
 *   - animate=true:            draws once on mount.
 *   - loop=<ms>:               re-draws every <ms> milliseconds. Use this
 *                              when the mark sits inside a parent that
 *                              re-renders frequently (eg. forms with
 *                              controlled inputs) so the animation does
 *                              not replay on every keystroke.
 */
export function NexusMark({ size = 32, animate = false, loop = 0, className = '' }) {
    const reduce = useReducedMotion();
    const shouldAnimate = animate && !reduce;
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!shouldAnimate || !loop) return undefined;
        const id = window.setInterval(() => setTick((t) => t + 1), loop);
        return () => window.clearInterval(id);
    }, [shouldAnimate, loop]);

    const stroke = 'rgb(var(--ink))';
    const accent = 'rgb(var(--accent))';
    const STROKE_W = 2;
    const ease = [0.65, 0, 0.35, 1];

    // Shared text props so the static and animated branches stay in sync
    // with the NEXUS wordmark (Space Grotesk, bold, tight tracking).
    // y positions the alphabetic baseline; for Space Grotesk Bold @ 22px the
    // cap height (~15.8) sits centred between the inner frame top (4) and
    // the baseline at y=23.5, which gives an optically balanced N.
    const nProps = {
        x: 16,
        y: 23.5,
        textAnchor: 'middle',
        fontFamily: '"Space Grotesk", Inter, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 22,
        fill: stroke,
        style: { letterSpacing: '-0.04em' }
    };

    if (!shouldAnimate) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 32 32"
                fill="none"
                className={className}
                aria-hidden="true"
            >
                <rect
                    x="4"
                    y="4"
                    width="24"
                    height="24"
                    stroke={stroke}
                    strokeWidth={STROKE_W}
                />
                <text {...nProps}>N</text>
                <rect
                    x="22"
                    y="6"
                    width="4"
                    height="4"
                    fill={accent}
                    stroke={stroke}
                    strokeWidth="1"
                />
            </svg>
        );
    }

    return (
        <svg
            key={tick}
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <motion.rect
                x="4"
                y="4"
                width="24"
                height="24"
                stroke={stroke}
                strokeWidth={STROKE_W}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease }}
            />
            <motion.text
                {...nProps}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45, ease }}
            >
                N
            </motion.text>
            <motion.rect
                x="22"
                y="6"
                width="4"
                height="4"
                fill={accent}
                stroke={stroke}
                strokeWidth="1"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 1.0, ease }}
                style={{ transformOrigin: '24px 8px' }}
            />
        </svg>
    );
}
