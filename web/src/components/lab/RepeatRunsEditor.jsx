import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

const MAX_REPEATS = 50;
const SID_MAX = 64;
const REASON_MAX = 500;

/**
 * Repeat-runs editor: same OFF/ON segmented header as KitToggle, but when ON
 * renders a stepper that grows/shrinks an array of (SID, reason) fieldsets.
 * Each entry is required server-side; the parent should also block submit when
 * any field is blank (see LabEntryPage submit guard).
 */
export function RepeatRunsEditor({ id, enabled, onToggle, repeats, onChange }) {
    const reduce = useReducedMotion();
    const count = repeats.length;

    const setCount = (next) => {
        const clamped = Math.max(1, Math.min(MAX_REPEATS, Math.floor(Number(next) || 1)));
        if (clamped === count) return;
        if (clamped > count) {
            const grown = repeats.concat(
                Array.from({ length: clamped - count }, () => ({ sid: '', reason: '' }))
            );
            onChange(grown);
        } else {
            onChange(repeats.slice(0, clamped));
        }
    };

    const updateItem = (idx, patch) => {
        onChange(repeats.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono uppercase text-eyebrow text-ink-2">Repeat runs</span>
                <div
                    className="inline-flex items-stretch border border-rule-soft"
                    role="radiogroup"
                    aria-label="Repeat runs toggle"
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
                        key="editor"
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.65, 0, 0.35, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="pt-2.5 space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex-1">
                                    <label
                                        htmlFor={`${id}-count`}
                                        className="block text-xs font-medium text-ink-2 mb-1.5"
                                    >
                                        Repeat run count
                                    </label>
                                    <p className="text-xs text-ink-3">
                                        One Sample ID + reason required for each repeat.
                                    </p>
                                </div>
                                <div className="inline-flex items-stretch border border-rule-soft">
                                    <button
                                        type="button"
                                        aria-label="Decrease repeat count"
                                        onClick={() => setCount(count - 1)}
                                        disabled={count <= 1}
                                        className="px-2.5 py-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-3 transition-colors"
                                    >
                                        <Minus className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
                                    </button>
                                    <input
                                        id={`${id}-count`}
                                        type="number"
                                        min={1}
                                        max={MAX_REPEATS}
                                        step={1}
                                        value={count}
                                        onChange={(e) => setCount(e.target.value)}
                                        className="w-14 text-center bg-transparent font-mono text-sm border-x border-rule-soft focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Increase repeat count"
                                        onClick={() => setCount(count + 1)}
                                        disabled={count >= MAX_REPEATS}
                                        className="px-2.5 py-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-3 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {repeats.map((r, idx) => (
                                    <fieldset
                                        key={idx}
                                        className="border border-rule-soft p-3 space-y-2.5"
                                    >
                                        <legend className="px-1.5 font-mono uppercase text-eyebrow text-ink-2">
                                            Run #{idx + 1}
                                        </legend>
                                        <div>
                                            <label
                                                htmlFor={`${id}-sid-${idx}`}
                                                className="block text-xs font-medium text-ink-2 mb-1.5"
                                            >
                                                Sample ID{' '}
                                                <span className="text-accent font-normal">*</span>
                                            </label>
                                            <input
                                                id={`${id}-sid-${idx}`}
                                                type="text"
                                                maxLength={SID_MAX}
                                                autoComplete="off"
                                                spellCheck={false}
                                                required
                                                aria-required="true"
                                                className="lab-input w-full font-mono uppercase tracking-wider"
                                                placeholder="e.g. S0001234"
                                                value={r.sid}
                                                onChange={(e) =>
                                                    updateItem(idx, { sid: e.target.value })
                                                }
                                                onBlur={(e) => {
                                                    const v = e.target.value
                                                        .trim()
                                                        .toUpperCase()
                                                        .slice(0, SID_MAX);
                                                    if (v !== r.sid) updateItem(idx, { sid: v });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor={`${id}-reason-${idx}`}
                                                className="block text-xs font-medium text-ink-2 mb-1.5"
                                            >
                                                Reason for repeat{' '}
                                                <span className="text-accent font-normal">*</span>
                                            </label>
                                            <textarea
                                                id={`${id}-reason-${idx}`}
                                                rows={2}
                                                maxLength={REASON_MAX}
                                                required
                                                aria-required="true"
                                                className="lab-input w-full"
                                                placeholder="e.g. Result outside QC range; rerun for confirmation"
                                                value={r.reason}
                                                onChange={(e) =>
                                                    updateItem(idx, { reason: e.target.value })
                                                }
                                            />
                                        </div>
                                    </fieldset>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
