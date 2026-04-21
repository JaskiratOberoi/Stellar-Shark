/**
 * Four 12px L-shaped brackets at the corners of the parent.
 * Parent must be position:relative. Pure CSS (no JS), animates via group-hover.
 *
 * Tone: 'ink' = full ink; 'accent' = brand accent (use sparingly).
 * Visible by default; pass `onHover` to only reveal under group-hover/focus.
 */
export function CornerBrackets({ tone = 'ink', onHover = false, size = 12, thickness = 1 }) {
    const color = tone === 'accent' ? 'rgb(var(--accent))' : 'rgb(var(--ink))';
    const base = 'absolute pointer-events-none transition-opacity duration-200 ease-snap';
    const visible = onHover
        ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        : 'opacity-100';
    const s = `${size}px`;
    const t = `${thickness}px`;
    const lineH = { width: s, height: t, background: color };
    const lineV = { width: t, height: s, background: color };
    return (
        <>
            <span className={`${base} ${visible} top-0 left-0`} style={lineH} aria-hidden />
            <span className={`${base} ${visible} top-0 left-0`} style={lineV} aria-hidden />
            <span className={`${base} ${visible} top-0 right-0`} style={lineH} aria-hidden />
            <span className={`${base} ${visible} top-0 right-0`} style={lineV} aria-hidden />
            <span className={`${base} ${visible} bottom-0 left-0`} style={lineH} aria-hidden />
            <span className={`${base} ${visible} bottom-0 left-0`} style={lineV} aria-hidden />
            <span className={`${base} ${visible} bottom-0 right-0`} style={lineH} aria-hidden />
            <span className={`${base} ${visible} bottom-0 right-0`} style={lineV} aria-hidden />
        </>
    );
}
