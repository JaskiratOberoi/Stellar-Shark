/**
 * Compact row of mono-uppercase chips that set a date relative to today.
 * Uses local time (not UTC) so the chip matches what the lab tech sees on the wall.
 */
function isoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function offsetIso(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return isoLocal(d);
}

const DEFAULT_OPTIONS = [
    { id: 'today', label: 'TODAY', days: 0 },
    { id: 'yesterday', label: 'YESTERDAY', days: -1 },
    { id: 'minus2', label: '−2D', days: -2 },
    { id: 'minus3', label: '−3D', days: -3 }
];

export function DateQuickPicks({ value, onChange, options = DEFAULT_OPTIONS, className = '' }) {
    return (
        <div
            className={`flex flex-wrap gap-1.5 ${className}`}
            role="group"
            aria-label="Date quick picks"
        >
            {options.map((opt) => {
                const iso = offsetIso(opt.days);
                const active = value === iso;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(iso)}
                        className={`px-2.5 py-1.5 border font-mono uppercase text-eyebrow transition-colors duration-150 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            active
                                ? 'border-accent bg-accent/10 text-ink ring-1 ring-accent/40'
                                : 'border-rule-soft text-ink-2 hover:border-ink hover:text-ink'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
