import { useState } from 'react';
import TEST_CODE_PRESETS from '../testCodePresets.json';

export function TestCodePresets({ testCode, setTestCode, running }) {
    const [open, setOpen] = useState(true);

    return (
        <div className="mb-5">
            <label className="block text-sm text-genomics-fg-muted mb-2" htmlFor="testcode-input">
                Test code <span className="text-genomics-fg-subtle">(optional)</span>
            </label>
            <input
                id="testcode-input"
                type="text"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                disabled={running}
                placeholder="Type a code or pick a button below"
                autoComplete="off"
                className="input-field font-mono text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={running}
                    onClick={() => setTestCode('')}
                    className="text-xs text-genomics-fg-subtle hover:text-genomics-fg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring rounded px-1"
                >
                    Clear test code
                </button>
                <button
                    type="button"
                    disabled={running}
                    onClick={() => setOpen((o) => !o)}
                    className="text-xs text-genomics-accent hover:text-genomics-accent-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring rounded px-1"
                    aria-expanded={open}
                >
                    {open ? 'Hide quick picks' : 'Show quick picks'}
                </button>
            </div>
            <p className="mt-2 text-xs text-genomics-fg-subtle mb-3">
                Sent to LIS “Testcode” as entered. Leave blank to include all tests.
            </p>
            {open ? (
                <>
                    <p className="text-xs text-genomics-fg-subtle mb-2">Quick picks</p>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto log-scroll pr-1 pb-1">
                        {TEST_CODE_PRESETS.map((preset) => {
                            const code = String(preset.code || '').trim();
                            const selected =
                                testCode.trim().toLowerCase() === code.toLowerCase() && code.length > 0;
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
                                    className={`px-2.5 py-1.5 rounded-lg text-left border transition-colors min-w-0 max-w-[11rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genomics-ring focus-visible:ring-offset-2 focus-visible:ring-offset-genomics-canvas ${
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
