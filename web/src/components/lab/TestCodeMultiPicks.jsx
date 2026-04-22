import { useMemo, useState } from 'react';
import TEST_CODE_PRESETS from '../../testCodePresets.json';
import { DEFAULT_VISIBLE_TEST_CODES } from '../../dashboardDefaults.js';

const DEFAULT_CODE_SET = new Set(DEFAULT_VISIBLE_TEST_CODES);

/**
 * Multi-select test-code chip group for inventory and similar UIs. Click toggles
 * membership; reuses the same preset list and + MORE as TestCodeQuickPicks.
 */
export function TestCodeMultiPicks({ value, onChange, disabled = false, className = '' }) {
    const [showAll, setShowAll] = useState(false);
    const selected = useMemo(
        () => new Set((value || []).map((c) => String(c).trim().toUpperCase()).filter(Boolean)),
        [value]
    );
    const selectedList = (value || []).map((c) => String(c).trim().toUpperCase()).filter(Boolean);

    const visible = useMemo(() => {
        if (showAll) return TEST_CODE_PRESETS;
        return TEST_CODE_PRESETS.filter((preset) => {
            const code = String(preset.code || '').trim();
            if (DEFAULT_CODE_SET.has(code)) return true;
            if (code && selected.has(code.toUpperCase())) return true;
            return false;
        });
    }, [showAll, selected]);

    const toggle = (code) => {
        const c = String(code).trim().toUpperCase();
        if (!c) return;
        const next = new Set(selected);
        if (next.has(c)) next.delete(c);
        else next.add(c);
        onChange([...next].sort());
    };

    return (
        <div className={className}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                    <span className="nexus-eyebrow">Supported tests (quick pick)</span>
                    <span className="font-mono text-[10px] uppercase text-ink-3">
                        {selectedList.length} selected
                    </span>
                    {selectedList.length > 0 ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange([])}
                            className="text-xs text-accent font-medium hover:underline disabled:opacity-40"
                        >
                            Clear all
                        </button>
                    ) : null}
                </div>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                    className="font-mono uppercase text-eyebrow text-ink-3 hover:text-ink transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1 shrink-0"
                >
                    {showAll ? '− less' : '+ more'}
                </button>
            </div>
            <div
                className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto log-scroll pr-1 pb-1"
                role="group"
                aria-label="Test code multi-select"
            >
                {visible.map((preset) => {
                    const code = String(preset.code || '').trim();
                    const isOn = code ? selected.has(code.toUpperCase()) : false;
                    return (
                        <button
                            key={code}
                            type="button"
                            disabled={disabled}
                            aria-pressed={isOn}
                            title={isOn ? `${preset.label} — click to remove` : `${preset.label} → add ${code}`}
                            onClick={() => toggle(code)}
                            className={`px-2.5 py-1.5 border min-w-0 max-w-[11rem] transition-colors duration-150 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${
                                isOn
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
