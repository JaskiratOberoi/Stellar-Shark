import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Segmented OFF / ON toggle that matches the ThemeToggle aesthetic.
 * When `enabled`, renders a numeric input below for the kit count.
 */
export function KitToggle({
    id,
    label,
    enabled,
    onToggle,
    value,
    onValueChange,
    inputLabel
}) {
    const reduce = useReducedMotion();
    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono uppercase text-eyebrow text-ink-2">{label}</span>
                <div
                    className="inline-flex items-stretch border border-rule-soft"
                    role="radiogroup"
                    aria-label={`${label} toggle`}
                >
                    {[
                        { id: 'off', value: false, text: 'OFF' },
                        { id: 'on', value: true, text: 'ON' }
                    ].map((opt) => {
                        const active = enabled === opt.value;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => onToggle(opt.value)}
                                className={`px-2.5 py-1.5 font-mono uppercase text-eyebrow transition-colors duration-150 ease-snap ${
                                    active
                                        ? 'bg-ink text-bg'
                                        : 'text-ink-3 hover:text-ink hover:bg-surface-2'
                                }`}
                            >
                                {opt.text}
                            </button>
                        );
                    })}
                </div>
            </div>
            <AnimatePresence initial={false}>
                {enabled ? (
                    <motion.div
                        key="input"
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.65, 0, 0.35, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="pt-2.5">
                            <label
                                htmlFor={id}
                                className="block text-xs font-medium text-ink-2 mb-1.5"
                            >
                                {inputLabel}
                            </label>
                            <input
                                id={id}
                                type="number"
                                min={0}
                                step={1}
                                value={value}
                                onChange={(e) => onValueChange(e.target.value)}
                                className="lab-input w-full"
                            />
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
