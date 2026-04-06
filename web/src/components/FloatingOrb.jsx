import { motion, useReducedMotion } from 'framer-motion';

export function FloatingOrb({ className, delay = 0 }) {
    const reduce = useReducedMotion();

    if (reduce) {
        return <div className={`absolute rounded-full blur-3xl pointer-events-none opacity-40 ${className}`} aria-hidden />;
    }

    return (
        <motion.div
            className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
            initial={{ opacity: 0.3, scale: 0.8 }}
            animate={{
                opacity: [0.35, 0.6, 0.35],
                scale: [0.95, 1.08, 0.95],
                x: [0, 25, -15, 0],
                y: [0, -20, 12, 0]
            }}
            transition={{
                duration: 14 + delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay
            }}
            aria-hidden
        />
    );
}
