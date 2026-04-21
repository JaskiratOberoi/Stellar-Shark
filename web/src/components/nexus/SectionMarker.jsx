/**
 * Editorial section eyebrow: "01 / OVERVIEW"
 * Pads the number with leading zero and uppercases the label.
 */
export function SectionMarker({ number, label, className = '' }) {
    const n = number != null ? String(number).padStart(2, '0') : null;
    return (
        <p className={`nexus-eyebrow inline-flex items-center gap-2 ${className}`}>
            {n ? (
                <>
                    <span className="text-ink">{n}</span>
                    <span className="text-ink-3">/</span>
                </>
            ) : null}
            <span>{label}</span>
        </p>
    );
}
