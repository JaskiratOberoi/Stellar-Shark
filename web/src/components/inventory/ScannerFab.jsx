import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanBarcode, X, Loader2 } from 'lucide-react';
import { apiFetch } from '../../apiClient.js';
import { startBarcodeScanner } from '../../lib/scanner.js';

/**
 * @param {{ items: any[], bus: any[], onRefresh: () => Promise<void> }} props
 */
export function ScannerFab({ items, bus, onRefresh }) {
    const [open, setOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [barcode, setBarcode] = useState('');
    const [lookupPending, setLookupPending] = useState(false);
    const [resolvingState, setResolvingState] = useState(
        /** @type {null | { kind: 'not_found' } | { kind: 'found', data: any }} */ (null)
    );
    /** @type {import('react').MutableRefObject<{ stop: () => void } | null>} */
    const scannerRef = useRef(null);
    const videoRef = useRef(null);
    const doneRef = useRef(false);

    const kitItems = items.filter((i) => i.type === 'kit');

    const stopScan = useCallback(() => {
        if (scannerRef.current) {
            try {
                scannerRef.current.stop();
            } catch {
                // ignore
            }
            scannerRef.current = null;
        }
        setScanning(false);
    }, []);

    const beep = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && window.AudioContext) {
                const ctx = new AudioContext();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.frequency.value = 880;
                g.gain.value = 0.08;
                o.start();
                setTimeout(() => {
                    o.stop();
                    ctx.close();
                }, 80);
            }
        } catch {
            // ignore
        }
    }, []);

    const haptic = useCallback(() => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(30);
            }
        } catch {
            // ignore
        }
    }, []);

    const resetFlow = useCallback(() => {
        setError(null);
        setBarcode('');
        doneRef.current = false;
    }, []);

    const resolveAndShow = useCallback(
        async (raw) => {
            const b = String(raw || '').trim();
            if (!b) {
                setError('Enter or scan a barcode');
                return;
            }
            setBarcode(b);
            setLookupPending(true);
            setError(null);
            const r = await apiFetch(`/api/admin/kit-units?barcode=${encodeURIComponent(b)}`);
            setLookupPending(false);
            if (r.status === 404) {
                setResolvingState({ kind: 'not_found' });
                return;
            }
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                setError(d.error || 'Lookup failed');
                return;
            }
            const d = await r.json();
            setResolvingState({ kind: 'found', data: d });
        },
        []
    );

    const onScanned = useCallback(
        async (raw) => {
            if (doneRef.current) return;
            doneRef.current = true;
            stopScan();
            haptic();
            beep();
            await resolveAndShow(raw);
        },
        [beep, haptic, resolveAndShow, stopScan]
    );

    useEffect(() => {
        if (!open) {
            stopScan();
            setResolvingState(null);
            resetFlow();
            return;
        }
        if (!videoRef.current) return;
        if (resolvingState) return;
        if (!scanning) return;

        (async () => {
            setError(null);
            try {
                const el = videoRef.current;
                if (!el) return;
                const ctrl = await startBarcodeScanner({ videoEl: el, onCode: onScanned });
                scannerRef.current = ctrl;
            } catch (e) {
                setError(e?.message || 'Camera access failed. Use manual entry or check HTTPS.');
                setScanning(false);
            }
        })();

        return () => {
            stopScan();
        };
    }, [open, scanning, resolvingState, onScanned, stopScan, resetFlow]);

    const close = () => {
        stopScan();
        setOpen(false);
        setResolvingState(null);
        resetFlow();
    };

    const postJson = async (path, body) => {
        const r = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Request failed');
        return d;
    };

    const afterSuccess = async () => {
        await onRefresh();
        setResolvingState(null);
        resetFlow();
        doneRef.current = false;
        if (open) {
            setScanning(true);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setOpen(true);
                    setResolvingState(null);
                    resetFlow();
                    doneRef.current = false;
                    setScanning(true);
                }}
                className="fixed z-30 flex h-14 w-14 items-center justify-center rounded-full border border-ink-3/30 bg-accent text-ink shadow-lg transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent/40 right-[max(1.5rem,env(safe-area-inset-right))] bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
                title="Scan kit barcode"
                aria-label="Open kit barcode scanner"
            >
                <ScanBarcode className="h-6 w-6" strokeWidth={1.75} />
            </button>

            {open ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Kit barcode scanner"
                >
                    <div className="w-full max-w-lg rounded-2xl border border-ink-3/25 bg-surface-elev p-4 shadow-2xl max-h-[min(90vh,34rem)] overflow-y-auto">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2">Kit scan</h2>
                            <div className="flex items-center gap-1">
                                <Link
                                    to="/admin/kit-units"
                                    className="text-xs text-accent underline-offset-2 hover:underline"
                                    onClick={close}
                                >
                                    All units
                                </Link>
                                <button
                                    type="button"
                                    onClick={close}
                                    className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-muted"
                                    aria-label="Close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {error ? (
                            <p className="mb-2 rounded-lg border border-warning/50 bg-warning-soft px-3 py-2 text-sm text-ink">
                                {error}
                            </p>
                        ) : null}

                        {lookupPending ? (
                            <div className="flex items-center gap-2 py-8 text-sm text-ink-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Looking up…
                            </div>
                        ) : null}

                        {resolvingState == null && !lookupPending ? (
                            <>
                                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/80">
                                    <video
                                        ref={videoRef}
                                        className="h-full w-full object-cover"
                                        playsInline
                                        muted
                                        autoPlay
                                    />
                                </div>
                                <p className="mt-2 text-xs text-ink-3">Point the camera at the kit barcode, or type it and press Enter.</p>
                                <form
                                    className="mt-3 flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        onScanned(barcode);
                                    }}
                                >
                                    <input
                                        className="lab-input flex-1 font-mono text-sm"
                                        placeholder="Manual barcode…"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                    />
                                    <button type="submit" className="btn-primary px-4 py-2 text-sm">
                                        Go
                                    </button>
                                </form>
                            </>
                        ) : null}

                        {resolvingState?.kind === 'not_found' ? (
                            <div className="mt-2 space-y-3">
                                <p className="text-sm text-ink-2">
                                    Unknown barcode <span className="font-mono text-ink">{barcode}</span>. Link it to
                                    a kit type:
                                </p>
                                <RegisterForm
                                    kitItems={kitItems}
                                    barcode={barcode}
                                    onRegister={async (itemId) => {
                                        await postJson('/api/admin/kit-units', { barcode, item_id: itemId });
                                        await afterSuccess();
                                    }}
                                />
                                <button type="button" className="btn-ghost w-full text-sm" onClick={afterSuccess}>
                                    Scan another
                                </button>
                            </div>
                        ) : null}

                        {resolvingState?.kind === 'found' ? (
                            <ActionPanel
                                data={resolvingState.data}
                                bus={bus}
                                barcode={barcode}
                                onAction={postJson}
                                onDone={afterSuccess}
                            />
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}

function RegisterForm({ kitItems, barcode, onRegister }) {
    const [itemId, setItemId] = useState(kitItems[0]?.id || '');
    const [saving, setSaving] = useState(false);
    return (
        <form
            className="space-y-2"
            onSubmit={async (e) => {
                e.preventDefault();
                if (!itemId) return;
                setSaving(true);
                try {
                    await onRegister(itemId);
                } finally {
                    setSaving(false);
                }
            }}
        >
            <label className="block text-xs text-ink-3">Kit item</label>
            <select className="lab-input w-full" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                {kitItems.map((i) => (
                    <option key={i.id} value={i.id}>
                        {i.name}
                    </option>
                ))}
            </select>
            <p className="text-xs text-ink-3">
                Registers as new stock <strong>+1</strong> to central. Barcode:{' '}
                <span className="font-mono">{barcode}</span>
            </p>
            {!kitItems.length ? (
                <p className="text-sm text-warning">Add a central kit line first (Admin → Inventory).</p>
            ) : null}
            <button
                type="submit"
                className="btn-primary w-full py-2.5 text-sm"
                disabled={saving || !kitItems.length}
            >
                {saving ? 'Saving…' : 'Register + add stock'}
            </button>
        </form>
    );
}

function ActionPanel({ data, bus, barcode, onAction, onDone }) {
    const u = data.unit;
    const [buId, setBuId] = useState(() => {
        const firstOther = bus.find((b) => b.id !== data?.unit?.current_bu_id);
        return (firstOther || bus[0])?.id || '';
    });
    const [busy, setBusy] = useState(false);
    if (!u) return null;
    return (
        <div className="mt-2 space-y-3">
            <p className="text-xs uppercase tracking-wider text-ink-3">Barcode</p>
            <p className="font-mono text-sm text-ink break-all">{barcode}</p>
            <p className="text-sm text-ink-2">
                {data.item?.name} <span className="text-ink-3">· {u.status}</span>
            </p>
            {u.status === 'central' ? (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!buId) return;
                        setBusy(true);
                        try {
                            await onAction('/api/admin/kit-units/transfer', { barcode, bu_id: buId });
                            await onDone();
                        } finally {
                            setBusy(false);
                        }
                    }}
                    className="space-y-2"
                >
                    <label className="block text-xs text-ink-3">Send to business unit</label>
                    <select className="lab-input w-full" value={buId} onChange={(e) => setBuId(e.target.value)}>
                        {bus.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="btn-primary w-full py-2.5 text-sm" disabled={busy || !bus.length}>
                        {busy ? '…' : 'Send to BU'}
                    </button>
                </form>
            ) : null}
            {u.status === 'at_bu' ? (
                <div className="space-y-2">
                    <p className="text-sm text-ink-2">At: {data.current_bu?.name || u.current_bu_id || '—'}</p>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            className="btn-primary w-full py-2.5 text-sm"
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    await onAction('/api/admin/kit-units/consume', { barcode });
                                    await onDone();
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            Mark consumed
                        </button>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!buId) return;
                                setBusy(true);
                                try {
                                    await onAction('/api/admin/kit-units/reassign', { barcode, bu_id: buId });
                                    await onDone();
                                } finally {
                                    setBusy(false);
                                }
                            }}
                            className="space-y-1"
                        >
                            <label className="text-xs text-ink-3">Move to another BU</label>
                            <div className="flex gap-2">
                                <select
                                    className="lab-input flex-1"
                                    value={buId}
                                    onChange={(e) => setBuId(e.target.value)}
                                >
                                    {bus.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                                <button type="submit" className="btn-ghost px-3 text-sm" disabled={busy}>
                                    Move
                                </button>
                            </div>
                        </form>
                        <button
                            type="button"
                            className="btn-ghost w-full text-sm text-warning"
                            disabled={busy}
                            onClick={async () => {
                                if (!window.confirm('Retire this kit? Stock will be decremented.')) return;
                                setBusy(true);
                                try {
                                    await onAction('/api/admin/kit-units/retire', { barcode });
                                    await onDone();
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            Retire
                        </button>
                    </div>
                </div>
            ) : null}
            {u.status === 'consumed' || u.status === 'retired' ? (
                <p className="text-sm text-ink-3">This unit is {u.status}. No actions.</p>
            ) : null}
            <button type="button" className="btn-ghost w-full text-sm" onClick={onDone} disabled={busy}>
                Scan another
            </button>
        </div>
    );
}
