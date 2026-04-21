import { useMemo, useState } from 'react';
import TEST_CODE_PRESETS from '../testCodePresets.json';
import { DEFAULT_VISIBLE_TEST_CODES } from '../dashboardDefaults.js';

const DEFAULT_CODE_SET = new Set(DEFAULT_VISIBLE_TEST_CODES);

export function TestCodePresets({ testCode, setTestCode, running, compact = false, sidebar = false }) {
    const [showAllPresets, setShowAllPresets] = useState(false);

    const trimmedCode = testCode.trim();
    const trimmedLower = trimmedCode.toLowerCase();

    const visiblePresets = useMemo(() => {
        if (showAllPresets) return TEST_CODE_PRESETS;
        return TEST_CODE_PRESETS.filter((preset) => {
            const code = String(preset.code || '').trim();
            if (DEFAULT_CODE_SET.has(code)) return true;
            if (trimmedCode && code.toLowerCase() === trimmedLower) return true;
            return false;
        });
    }, [showAllPresets, trimmedCode, trimmedLower]);

    const labelCls = sidebar
        ? 'block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2'
        : compact
          ? 'text-xs text-genomics-fg-muted mb-1'
          : 'text-sm text-genomics-fg-muted mb-2';
    const inputCls = sidebar
        ? 'lab-input w-full pl-9 font-mono text-xs'
        : compact
          ? 'input-field font-mono text-xs'
          : 'input-field font-mono text-sm';
    const pickMax = sidebar ? 'max-h-36' : compact ? 'max-h-28' : 'max-h-48';
    const mb = sidebar ? 'mb-0' : compact ? 'mb-3' : 'mb-5';

    return (
        <div className={mb}>
            <label className={labelCls} htmlFor="testcode-input">
                {sidebar ? 'Filter specification' : 'Test code'}{' '}
                {!sidebar ? <span className="text-genomics-fg-subtle font-normal normal-case">(optional)</span> : null}
            </label>
            <div className={sidebar ? 'relative' : undefined}>
                {sidebar ? (
                    <svg
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                ) : null}
                <input
                    id="testcode-input"
                    type="text"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    disabled={running}
                    placeholder={sidebar ? 'e.g. BI005' : 'Type a code or pick below'}
                    autoComplete="off"
                    className={inputCls}
                />
            </div>
            <div className="mt-1.5">
                <button
                    type="button"
                    disabled={running}
                    onClick={() => setTestCode('')}
                    className={`disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 rounded px-1 ${
                        sidebar
                            ? 'text-[10px] uppercase tracking-wide text-slate-500 hover:text-slate-400 focus-visible:ring-cyan-500/40'
                            : 'text-[11px] text-genomics-fg-subtle hover:text-genomics-fg-muted focus-visible:ring-genomics-ring'
                    }`}
                >
                    Clear
                </button>
            </div>
            <p
                className={
                    sidebar
                        ? 'mt-2 text-[10px] text-slate-500 mb-3 leading-relaxed'
                        : `mt-1 ${compact ? 'text-[10px] mb-2' : 'text-xs mb-3'} text-genomics-fg-subtle`
                }
            >
                {sidebar
                    ? 'Sent to LIS as entered. Leave blank for all tests.'
                    : 'Sent to LIS “Testcode” as entered. Blank = all tests.'}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <p
                    className={
                        sidebar
                            ? 'text-[10px] font-semibold uppercase tracking-wider text-slate-500'
                            : `${compact ? 'text-[10px]' : 'text-xs'} text-genomics-fg-subtle`
                    }
                >
                    Quick picks
                </p>
                <button
                    type="button"
                    disabled={running}
                    onClick={() => setShowAllPresets((v) => !v)}
                    className={`disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 rounded px-1 ${
                        sidebar
                            ? 'text-[10px] uppercase tracking-wide text-sky-400 hover:text-sky-300 focus-visible:ring-cyan-500/40'
                            : 'text-[11px] text-genomics-accent hover:text-genomics-accent-hover focus-visible:ring-genomics-ring'
                    }`}
                    aria-expanded={showAllPresets}
                >
                    {showAllPresets ? 'Show fewer codes' : 'Show all test codes'}
                </button>
            </div>
            <div className={`flex flex-wrap gap-1.5 ${pickMax} overflow-y-auto log-scroll pr-1 pb-1`}>
                {visiblePresets.map((preset) => {
                    const code = String(preset.code || '').trim();
                    const selected =
                        testCode.trim().toLowerCase() === code.toLowerCase() && code.length > 0;
                    const btnPad = sidebar
                        ? 'px-2.5 py-2 rounded-lg text-left min-w-0 max-w-[7.5rem]'
                        : compact
                          ? 'px-2 py-1 rounded-md'
                          : 'px-2.5 py-1.5 rounded-lg';
                    const ringOff = sidebar
                        ? 'border-white/12 text-slate-400 hover:border-white/25 hover:text-slate-200'
                        : 'border-genomics-border text-genomics-fg-muted hover:border-white/18 hover:text-genomics-fg';
                    const ringOn =
                        'border-accent bg-accent/10 text-ink ring-1 ring-accent/40';
                    return (
                        <button
                            key={code}
                            type="button"
                            disabled={running}
                            title={
                                selected
                                    ? `${preset.label} — click again to clear`
                                    : `${preset.label} → ${code}`
                            }
                            aria-pressed={selected}
                            onClick={() => {
                                if (selected) setTestCode('');
                                else setTestCode(code);
                            }}
                            className={`${btnPad} border transition-colors min-w-0 sm:max-w-[11rem] focus-visible:outline-none focus-visible:ring-2 ${
                                sidebar
                                    ? 'focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d18]'
                                    : 'focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas'
                            } ${selected ? ringOn : ringOff} disabled:opacity-40`}
                        >
                            <span className="block text-[11px] leading-tight truncate">{preset.label}</span>
                            <span
                                className={`block font-mono text-[10px] mt-0.5 ${
                                    sidebar ? 'text-slate-500' : 'text-genomics-fg-subtle'
                                }`}
                            >
                                {code}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
