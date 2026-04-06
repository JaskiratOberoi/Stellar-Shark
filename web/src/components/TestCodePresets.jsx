import { useState } from 'react';
import TEST_CODE_PRESETS from '../testCodePresets.json';

export function TestCodePresets({ testCode, setTestCode, running, compact = false, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);

    const labelCls = compact ? 'text-xs text-genomics-fg-muted mb-1' : 'text-sm text-genomics-fg-muted mb-2';
    const inputCls = compact ? 'input-field font-mono text-xs' : 'input-field font-mono text-sm';
    const pickMax = compact ? 'max-h-28' : 'max-h-48';
    const mb = compact ? 'mb-3' : 'mb-5';

    return (
        <div className={mb}>
            <label className={`block ${labelCls}`} htmlFor="testcode-input">
                Test code <span className="text-genomics-fg-subtle">(optional)</span>
            </label>
            <input
                id="testcode-input"
                type="text"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                disabled={running}
                placeholder="Type a code or pick below"
                autoComplete="off"
                className={inputCls}
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={running}
                    onClick={() => setTestCode('')}
                    className="text-[11px] text-genomics-fg-subtle hover:text-genomics-fg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring rounded px-1"
                >
                    Clear
                </button>
                <button
                    type="button"
                    disabled={running}
                    onClick={() => setOpen((o) => !o)}
                    className="text-[11px] text-genomics-accent hover:text-genomics-accent-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring rounded px-1"
                    aria-expanded={open}
                >
                    {open ? 'Hide quick picks' : 'Show quick picks'}
                </button>
            </div>
            <p className={`mt-1 ${compact ? 'text-[10px] mb-2' : 'text-xs mb-3'} text-genomics-fg-subtle`}>
                Sent to LIS “Testcode” as entered. Blank = all tests.
            </p>
            {open ? (
                <>
                    <p className={`${compact ? 'text-[10px] mb-1' : 'text-xs mb-2'} text-genomics-fg-subtle`}>
                        Quick picks
                    </p>
                    <div className={`flex flex-wrap gap-1.5 ${pickMax} overflow-y-auto log-scroll pr-1 pb-1`}>
                        {TEST_CODE_PRESETS.map((preset) => {
                            const code = String(preset.code || '').trim();
                            const selected =
                                testCode.trim().toLowerCase() === code.toLowerCase() && code.length > 0;
                            const btnPad = compact ? 'px-2 py-1 rounded-md' : 'px-2.5 py-1.5 rounded-lg';
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
                                    className={`${btnPad} text-left border transition-colors min-w-0 max-w-[10rem] sm:max-w-[11rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas ${
                                        selected
                                            ? 'border-cyan-400/70 bg-cyan-950/40 text-white ring-1 ring-cyan-500/30'
                                            : 'border-genomics-border text-genomics-fg-muted hover:border-white/18 hover:text-genomics-fg'
                                    } disabled:opacity-40`}
                                >
                                    <span className="block text-[11px] leading-tight truncate">{preset.label}</span>
                                    <span className="block font-mono text-[10px] mt-0.5 text-genomics-fg-subtle">
                                        {code}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </>
            ) : null}
        </div>
    );
}
