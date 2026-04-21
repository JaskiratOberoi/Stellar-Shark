import { motion, useReducedMotion } from 'framer-motion';
import { NexusMark } from './NexusMark.jsx';

/**
 * Branded loading state. Pulsing Nexus mark over a shimmering hairline rule.
 * Use full=true to fill the viewport, otherwise compact inline.
 */
export function LoadingMark({ full = false, label = 'Loading', className = '' }) {
    const reduce = useReducedMotion();
    const wrapper = full
        ? `min-h-dvh flex items-center justify-center bg-bg ${className}`
        : `min-h-[40vh] flex items-center justify-center ${className}`;
    return (
        <div className={wrapper}>
            <div className="flex flex-col items-center gap-5 w-[240px]">
                {reduce ? (
                    <NexusMark size={40} />
                ) : (
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <NexusMark size={40} />
                    </motion.div>
                )}
                <div className="w-full h-px bg-rule-soft overflow-hidden">
                    <div className="nexus-shimmer h-full w-full" />
                </div>
                <p className="font-mono uppercase text-eyebrow text-ink-3">{label}</p>
            </div>
        </div>
    );
}
