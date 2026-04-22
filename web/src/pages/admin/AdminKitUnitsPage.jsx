import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Barcode } from 'lucide-react';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';
import { ScannerFab } from '../../components/inventory/ScannerFab.jsx';

export function AdminKitUnitsPage() {
    const [items, setItems] = useState([]);
    const [bus, setBus] = useState([]);
    const [units, setUnits] = useState([]);
    const [error, setError] = useState(null);
    const [itemFilter, setItemFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [buFilter, setBuFilter] = useState('');

    const loadMeta = useCallback(async () => {
        const [ir, br] = await Promise.all([
            apiFetch('/api/admin/inventory/items'),
            apiFetch('/api/admin/business-units')
        ]);
        const i = await ir.json();
        const b = await br.json();
        if (!ir.ok) throw new Error(i.error);
        if (!br.ok) throw new Error(b.error);
        setItems(i.items || []);
        setBus(b.businessUnits || []);
    }, []);

    const loadUnits = useCallback(async () => {
        const u = new URLSearchParams();
        u.set('limit', '500');
        if (itemFilter) u.set('item_id', itemFilter);
        if (statusFilter) u.set('status', statusFilter);
        if (buFilter) u.set('bu_id', buFilter);
        const r = await apiFetch(`/api/admin/kit-units?${u.toString()}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to load');
        setUnits(d.units || []);
    }, [itemFilter, statusFilter, buFilter]);

    useEffect(() => {
        loadMeta().catch((e) => setError(e.message));
    }, [loadMeta]);

    useEffect(() => {
        loadUnits().catch((e) => setError(e.message));
    }, [loadUnits]);

    const post = async (path, body) => {
        setError(null);
        const r = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Request failed');
        return d;
    };

    return (
        <PageShell
            badge="Admin · Tracked kit units"
            badgeIcon={Barcode}
            title="Kit units"
            description="Per–physical kit barcodes: central, at business units, consumed, and retired. Use the scanner on Inventory or the floating button here."
            error={error}
            maxWidthClass="max-w-6xl"
        >
            <ScannerFab
                items={items}
                bus={bus}
                onRefresh={async () => {
                    await loadMeta();
                    await loadUnits();
                }}
            />
            <p className="text-sm text-ink-2 mb-4">
                <Link to="/admin/inventory" className="text-accent hover:underline">
                    ← Back to inventory
                </Link>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                    <label className="text-xs text-ink-3">Item</label>
                    <select
                        className="lab-input w-full text-sm"
                        value={itemFilter}
                        onChange={(e) => setItemFilter(e.target.value)}
                    >
                        <option value="">All</option>
                        {items
                            .filter((x) => x.type === 'kit')
                            .map((i) => (
                                <option key={i.id} value={i.id}>
                                    {i.name}
                                </option>
                            ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-ink-3">Status</label>
                    <select
                        className="lab-input w-full text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="central">central</option>
                        <option value="at_bu">at_bu</option>
                        <option value="consumed">consumed</option>
                        <option value="retired">retired</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-ink-3">Business unit (current)</label>
                    <select
                        className="lab-input w-full text-sm"
                        value={buFilter}
                        onChange={(e) => setBuFilter(e.target.value)}
                    >
                        <option value="">All</option>
                        {bus.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        type="button"
                        className="btn-ghost w-full py-2 text-sm"
                        onClick={() => {
                            setItemFilter('');
                            setStatusFilter('');
                            setBuFilter('');
                        }}
                    >
                        Clear filters
                    </button>
                </div>
            </div>

            <div className="lab-card p-0 overflow-x-auto">
                <table className="data-table data-table-lab w-full min-w-[720px] text-xs">
                    <thead>
                        <tr>
                            <th className="pl-4">Barcode</th>
                            <th>Item</th>
                            <th>Status</th>
                            <th>Current BU</th>
                            <th>Last event</th>
                            <th className="pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {units.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-ink-3">
                                    No units match. Register barcodes from Inventory (scanner or add form).
                                </td>
                            </tr>
                        ) : (
                            units.map((u) => (
                                <UnitRow
                                    key={u.id}
                                    u={u}
                                    bus={bus}
                                    onChanged={loadUnits}
                                    post={post}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </PageShell>
    );
}

function UnitRow({ u, bus, onChanged, post }) {
    const [moveTo, setMoveTo] = useState(
        (bus.find((b) => b.id !== u.current_bu_id) || bus[0])?.id || ''
    );
    const [saving, setSaving] = useState(false);

    return (
        <tr className="hover:bg-surface-muted/40">
            <td className="pl-4 py-2.5 font-mono text-ink break-all max-w-[10rem]">{u.barcode}</td>
            <td className="py-2.5 text-ink-2">{u.item_name || u.item_id}</td>
            <td className="py-2.5 uppercase text-ink-2">{u.status}</td>
            <td className="py-2.5 text-ink-2">{u.bu_name || '—'}</td>
            <td className="py-2.5 text-ink-3 whitespace-nowrap">
                {u.last_event_at
                    ? new Date(u.last_event_at).toLocaleString()
                    : u.registered_at
                      ? new Date(u.registered_at).toLocaleString()
                      : '—'}
            </td>
            <td className="pr-4 py-2.5 text-right">
                <div className="inline-flex flex-col sm:flex-row gap-1 items-stretch sm:items-center justify-end">
                    {u.status === 'central' && bus.length ? (
                        <form
                            className="inline-flex flex-wrap gap-1 justify-end"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!moveTo) return;
                                setSaving(true);
                                try {
                                    await post('/api/admin/kit-units/transfer', {
                                        barcode: u.barcode,
                                        bu_id: moveTo
                                    });
                                    await onChanged();
                                } catch (err) {
                                    window.alert(err.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            <select
                                className="lab-input !py-1 text-[11px] max-w-[7rem]"
                                value={moveTo}
                                onChange={(e) => setMoveTo(e.target.value)}
                            >
                                {bus.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="btn-primary px-2 py-1 text-[11px]" disabled={saving}>
                                Send
                            </button>
                        </form>
                    ) : null}
                    {u.status === 'at_bu' && bus.length > 1 ? (
                        <form
                            className="inline-flex flex-wrap gap-1 justify-end"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!moveTo) return;
                                setSaving(true);
                                try {
                                    await post('/api/admin/kit-units/reassign', {
                                        barcode: u.barcode,
                                        bu_id: moveTo
                                    });
                                    await onChanged();
                                } catch (err) {
                                    window.alert(err.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            <select
                                className="lab-input !py-1 text-[11px] max-w-[7rem]"
                                value={moveTo}
                                onChange={(e) => setMoveTo(e.target.value)}
                            >
                                {bus.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="btn-ghost px-2 py-1 text-[11px]" disabled={saving}>
                                Move
                            </button>
                        </form>
                    ) : null}
                    {u.status === 'at_bu' ? (
                        <button
                            type="button"
                            className="btn-ghost px-2 py-1 text-[11px]"
                            disabled={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await post('/api/admin/kit-units/consume', { barcode: u.barcode });
                                    await onChanged();
                                } catch (err) {
                                    window.alert(err.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            Consume
                        </button>
                    ) : null}
                    {u.status === 'central' || u.status === 'at_bu' ? (
                        <button
                            type="button"
                            className="text-[11px] text-warning px-2 py-1"
                            disabled={saving}
                            onClick={async () => {
                                if (!window.confirm('Retire this unit? Stock will be adjusted.')) return;
                                setSaving(true);
                                try {
                                    await post('/api/admin/kit-units/retire', { barcode: u.barcode });
                                    await onChanged();
                                } catch (err) {
                                    window.alert(err.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            Retire
                        </button>
                    ) : null}
                </div>
            </td>
        </tr>
    );
}
