import { useTheme } from '../../contexts/ThemeContext.jsx';

const OPTIONS = [
    { id: 'light', label: 'LGT' },
    { id: 'system', label: 'SYS' },
    { id: 'dark', label: 'DRK' }
];

export function ThemeToggle({ className = '' }) {
    const { mode, setMode } = useTheme();
    return (
        <div
            className={`inline-flex items-stretch border border-rule-soft ${className}`}
            role="radiogroup"
            aria-label="Color theme"
        >
            {OPTIONS.map((opt) => {
                const active = mode === opt.id;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMode(opt.id)}
                        className={`px-2.5 py-1.5 font-mono uppercase text-eyebrow transition-colors duration-150 ease-snap ${
                            active ? 'bg-ink text-bg' : 'text-ink-3 hover:text-ink hover:bg-surface-2'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
