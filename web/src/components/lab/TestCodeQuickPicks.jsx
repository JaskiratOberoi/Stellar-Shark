import { useMemo, useState } from 'react';
import TEST_CODE_PRESETS from '../../testCodePresets.json';
import { DEFAULT_VISIBLE_TEST_CODES } from '../../dashboardDefaults.js';

const DEFAULT_CODE_SET = new Set(DEFAULT_VISIBLE_TEST_CODES);

/**
 * Lightweight test-code quick-pick chip group used by Lab Entry and Lab History.
 * Renders the default 5 visible codes by default with a + MORE chevron to expand.
 * Selecting an active chip clears the value.
 */
export function TestCodeQuickPicks({ value, onChange, disabled = false, className = '' }) {
    const [showAll, setShowAll] = useState(false);
    const trimmed = (value || '').trim();
    const trimmedLower = trimmed.toLowerCase();

    const visible = useMemo(() => {
        if (showAll) return TEST_CODE_PRESETS;
        return TEST_CODE_PRESETS.filter((preset) => {
            const code = String(preset.code || '').trim();
            if (DEFAULT_CODE_SET.has(code)) return true;
            if (trimmed && code.toLowerCase() === trimmedLower) return true;
            return false;
        });
    }, [showAll, trimmed, trimmedLower]);

    return (
        <div className={className}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="nexus-eyebrow">Quick picks</span>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                    className="font-mono uppercase text-eyebrow text-ink-3 hover:text-ink transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1"
                >
                    {showAll ? '− less' : '+ more'}
                </button>
            </div>
            <div
                className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto log-scroll pr-1 pb-1"
                role="group"
                aria-label="Test code quick picks"
            >
                {visible.map((preset) => {
                    const code = String(preset.code || '').trim();
                    const selected = trimmedLower === code.toLowerCase() && code.length > 0;
                    return (
                        <button
                            key={code}
                            type="button"
                            disabled={disabled}
                            aria-pressed={selected}
                            title={
                                selected
                                    ? `${preset.label} — click again to clear`
                                    : `${preset.label} → ${code}`
                            }
                            onClick={() => onChange(selected ? '' : code)}
                            className={`px-2.5 py-1.5 border min-w-0 max-w-[11rem] transition-colors duration-150 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${
                                selected
                                    ? 'border-accent bg-accent/10 text-ink ring-1 ring-accent/40'
                                    : 'border-rule-soft text-ink-2 hover:border-ink hover:text-ink'
                            }`}
                        >
                            <span className="block text-[11px] leading-tight truncate">
                                {preset.label}
                            </span>
                            <span className="block font-mono text-[10px] text-ink-3 mt-0.5">
                                {code}
                            </span>
                        </button>
                    );
                })}
                {visible.length === 0 ? (
                    <span className="text-xs text-ink-3 italic px-1 py-1">No matching presets.</span>
                ) : null}
            </div>
        </div>
    );
}
