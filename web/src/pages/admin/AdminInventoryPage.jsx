import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, Search } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';
import { TestCodeMultiPicks } from '../../components/lab/TestCodeMultiPicks.jsx';
import { ScannerFab } from '../../components/inventory/ScannerFab.jsx';

export function AdminInventoryPage() {
    const [items, setItems] = useState([]);
    const [byBu, setByBu] = useState([]);
    const [bus, setBus] = useState([]);
    const [txns, setTxns] = useState([]);
    const [aggregates, setAggregates] = useState({ byItem: {} });
    const [form, setForm] = useState({
        type: 'kit',
        name: '',
        total_quantity: 0,
        tests_per_kit: '',
        supported_test_codes: [],
        kit_id_barcode: ''
    });
    const [send, setSend] = useState({ item_id: '', bu_id: '', quantity: 1, notes: '' });
    const [error, setError] = useState(null);
    const [addingItem, setAddingItem] = useState(false);
    const [sending, setSending] = useState(false);
    const [inspectItem, setInspectItem] = useState(null);
    const [inspectUnits, setInspectUnits] = useState([]);
    const [inspectLoading, setInspectLoading] = useState(false);

    const load = async () => {
        const [ir, br, bur, tr, ar] = await Promise.all([
            apiFetch('/api/admin/inventory/items'),
            apiFetch('/api/admin/business-units'),
            apiFetch('/api/admin/inventory/by-bu'),
            apiFetch('/api/admin/inventory/transactions?limit=100'),
            apiFetch('/api/admin/kit-units/aggregates')
        ]);
        const i = await ir.json();
        const b = await br.json();
        const bu = await bur.json();
        const t = await tr.json();
        const a = await ar.json();
        if (!ir.ok) throw new Error(i.error);
        if (!br.ok) throw new Error(b.error);
        if (!bur.ok) throw new Error(bu.error);
        if (!tr.ok) throw new Error(t.error);
        if (!ar.ok) throw new Error(a.error);
        setItems(i.items || []);
        setBus(b.businessUnits || []);
        setByBu(bu.rows || []);
        setTxns(t.transactions || []);
        setAggregates(a || { byItem: {} });
        if (!send.bu_id && b.businessUnits?.[0]) setSend((s) => ({ ...s, bu_id: b.businessUnits[0].id }));
        if (!send.item_id && i.items?.[0]) setSend((s) => ({ ...s, item_id: i.items[0].id }));
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openInspect = async (item) => {
        setInspectItem(item);
        setInspectLoading(true);
        setInspectUnits([]);
        try {
            const r = await apiFetch(
                `/api/admin/kit-units?item_id=${encodeURIComponent(item.id)}&status=central&limit=500`
            );
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load');
            setInspectUnits(d.units || []);
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setInspectLoading(false);
        }
    };

    const addItem = async (e) => {
        e.preventDefault();
        setError(null);
        setAddingItem(true);
        try {
            if (form.type === 'kit') {
                const tpk = Number(form.tests_per_kit);
                if (!Number.isFinite(tpk) || tpk < 1 || tpk !== Math.floor(tpk)) {
                    throw new Error('Tests per kit is required for kit items (a positive whole number).');
                }
            }
            const linkBarcode =
                form.type === 'kit' ? String(form.kit_id_barcode || '').trim() : '';
            if (linkBarcode) {
                if (Number(form.total_quantity) < 1) {
                    throw new Error('Set central qty to at least 1 when linking a Kit ID barcode.');
                }
            }
            const payload = {
                type: form.type,
                name: form.name,
                total_quantity: form.total_quantity,
                ...(form.type === 'kit' && {
                    tests_per_kit: Number(form.tests_per_kit),
                    supported_test_codes: form.supported_test_codes
                })
            };
            const res = await apiFetch('/api/admin/inventory/items', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not add item');
            const newId = d.item?.id;
            if (linkBarcode && newId) {
                const r2 = await apiFetch('/api/admin/kit-units', {
                    method: 'POST',
                    body: JSON.stringify({ barcode: linkBarcode, item_id: newId, link_only: true })
                });
                const d2 = await r2.json();
                if (!r2.ok) throw new Error(d2.error || 'Item created but could not link Kit ID');
            }
            setForm({
                type: 'kit',
                name: '',
                total_quantity: 0,
                tests_per_kit: '',
                supported_test_codes: [],
                kit_id_barcode: ''
            });
            await load();
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setAddingItem(false);
        }
    };

    const sendStock = async (e) => {
        e.preventDefault();
        setError(null);
        setSending(true);
        try {
            const res = await apiFetch('/api/admin/inventory/send', {
                method: 'POST',
                body: JSON.stringify({
                    item_id: send.item_id,
                    bu_id: send.bu_id,
                    quantity: Number(send.quantity),
                    notes: send.notes
                })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Send failed');
            await load();
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSending(false);
        }
    };

    const dailyDeduction = async () => {
        const date = window.prompt('Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
        if (!date) return;
        setError(null);
        try {
            const res = await apiFetch('/api/admin/inventory/daily-deduction', {
                method: 'POST',
                body: JSON.stringify({ date })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Deduction failed');
            await load();
        } catch (err) {
            setError(err.message || String(err));
        }
    };

    const lowRows = byBu.filter((r) => {
        const th = r.low_stock_threshold ?? items.find((i) => i.id === r.item_id)?.low_stock_threshold;
        return th != null && r.quantity <= th;
    });

    const sendSelectedItem = useMemo(
        () => items.find((i) => i.id === send.item_id),
        [items, send.item_id]
    );
    const sendQty = Number(send.quantity) || 0;
    const sendTestsCapacity =
        sendSelectedItem?.type === 'kit' && sendSelectedItem?.tests_per_kit
            ? sendQty * Number(sendSelectedItem.tests_per_kit)
            : null;

    return (
        <PageShell
            badge="Admin · Inventory"
            badgeIcon={Warehouse}
            title="Inventory"
            description="Central stock, allocations to business units, transactions, and low-stock awareness."
            error={error}
            maxWidthClass="max-w-6xl"
        >
            <ScannerFab items={items} bus={bus} onRefresh={load} />
            {lowRows.length ? (
                <div className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-ink shadow-sm">
                    <strong className="font-semibold">Low stock</strong>
                    <span className="text-ink-secondary">
                        {' '}
                        {lowRows.map((r) => `${r.item_name} @ ${r.bu_name} (${r.quantity})`).join('; ')}
                    </span>
                </div>
            ) : null}

            <p className="text-sm text-ink-2">
                <Link to="/admin/kit-units" className="text-accent hover:underline">
                    Tracked kit units
                </Link>{' '}
                — search barcodes, retire, and audit.
            </p>

            <section aria-labelledby="add-inv-heading">
                <h2 id="add-inv-heading" className="sr-only">
                    Add inventory item
                </h2>
                <form onSubmit={addItem} className="lab-card p-5 md:p-6 shadow-card">
                    <p className="text-sm font-semibold text-ink mb-4">Add central item</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="inv-type">
                                Type
                            </label>
                            <select
                                id="inv-type"
                                className="lab-input w-full"
                                value={form.type}
                                onChange={(e) => {
                                    const type = e.target.value;
                                    setForm((f) => ({
                                        ...f,
                                        type,
                                        ...(type !== 'kit'
                                            ? { tests_per_kit: '', supported_test_codes: [], kit_id_barcode: '' }
                                            : {})
                                    }));
                                }}
                            >
                                <option value="kit">kit</option>
                                <option value="card">card</option>
                                <option value="lot">lot</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="inv-name">
                                Name
                            </label>
                            <input
                                id="inv-name"
                                className="lab-input w-full"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="inv-qty">
                                Central qty
                            </label>
                            <input
                                id="inv-qty"
                                type="number"
                                className="lab-input w-full"
                                value={form.total_quantity}
                                onChange={(e) => setForm({ ...form, total_quantity: Number(e.target.value) })}
                            />
                        </div>
                        {form.type === 'kit' ? (
                            <div className="sm:col-span-2">
                                <label
                                    className="block text-xs font-medium text-ink-2 mb-1.5"
                                    htmlFor="inv-tpk"
                                >
                                    Tests per kit <span className="text-accent font-normal">*</span>
                                </label>
                                <input
                                    id="inv-tpk"
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="lab-input w-full"
                                    value={form.tests_per_kit}
                                    onChange={(e) => setForm({ ...form, tests_per_kit: e.target.value })}
                                />
                            </div>
                        ) : null}
                        {form.type === 'kit' ? (
                            <div className="sm:col-span-2">
                                <label
                                    className="block text-xs font-medium text-ink-2 mb-1.5"
                                    htmlFor="kit-id-barcode"
                                >
                                    Kit ID (barcode) <span className="text-ink-3">optional</span>
                                </label>
                                <input
                                    id="kit-id-barcode"
                                    className="lab-input w-full font-mono text-sm"
                                    placeholder="Scan or paste one unit’s barcode (no +1 to qty)"
                                    value={form.kit_id_barcode}
                                    onChange={(e) => setForm({ ...form, kit_id_barcode: e.target.value })}
                                />
                            </div>
                        ) : null}
                        {form.type === 'kit' ? (
                            <div className="sm:col-span-4">
                                <TestCodeMultiPicks
                                    value={form.supported_test_codes}
                                    onChange={(codes) => setForm((f) => ({ ...f, supported_test_codes: codes }))}
                                />
                            </div>
                        ) : null}
                        <div className="sm:col-span-4">
                            <button
                                type="submit"
                                disabled={addingItem}
                                className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60"
                            >
                                {addingItem ? 'Adding…' : 'Add item'}
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <DataTableShell title="Central stock" count={items.length}>
                <table className="data-table data-table-lab w-full min-w-0 table-fixed hidden md:table">
                    <colgroup>
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '12%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="pl-5">Name</th>
                            <th>Type</th>
                            <th className="text-right">Tests/kit</th>
                            <th>Tests</th>
                            <th className="text-right pr-1">Qty</th>
                            <th className="text-right pr-1">Tracked</th>
                            <th className="pr-5" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-3">
                                    No central items yet.
                                </td>
                            </tr>
                        ) : (
                            items.map((i) => {
                                const codes = Array.isArray(i.supported_test_codes)
                                    ? i.supported_test_codes
                                    : [];
                                const tr = i.type === 'kit' ? aggregates.byItem?.[i.id]?.central ?? 0 : '—';
                                return (
                                    <tr key={i.id} className="hover:bg-surface-muted/50 transition-colors">
                                        <td className="pl-5 py-3 text-sm font-medium text-ink truncate">
                                            {i.name}
                                        </td>
                                        <td className="py-3 text-sm text-ink-2">{i.type}</td>
                                        <td className="py-3 text-sm text-right tabular-nums text-ink-2">
                                            {i.tests_per_kit != null ? i.tests_per_kit : '—'}
                                        </td>
                                        <td
                                            className="py-3 text-sm font-mono text-[10px] uppercase text-ink-2 truncate"
                                            title={codes.join(', ')}
                                        >
                                            {codes.length ? codes.join(', ') : '—'}
                                        </td>
                                        <td className="py-3 text-sm tabular-nums text-right pr-1">
                                            {i.total_quantity}
                                        </td>
                                        <td className="py-3 text-sm tabular-nums text-right pr-1 text-ink-2">
                                            {tr}
                                        </td>
                                        <td className="pr-5 py-3 text-right">
                                            {i.type === 'kit' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openInspect(i)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-ink-3/30 px-2 py-1 text-xs text-ink-2 hover:bg-surface-muted"
                                                >
                                                    <Search className="h-3.5 w-3.5" />
                                                    Inspect
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                <ul className="md:hidden m-0 list-none divide-y divide-rule-soft p-0" aria-label="Central stock (mobile)">
                    {items.length === 0 ? (
                        <li className="px-4 py-12 text-center text-sm text-ink-3">No central items yet.</li>
                    ) : (
                        items.map((i) => {
                            const codes = Array.isArray(i.supported_test_codes) ? i.supported_test_codes : [];
                            const tr = i.type === 'kit' ? aggregates.byItem?.[i.id]?.central ?? 0 : '—';
                            return (
                                <li key={i.id} className="px-4 py-3">
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{i.name}</p>
                                        <span className="shrink-0 font-mono text-eyebrow uppercase text-ink-3">
                                            {i.type}
                                        </span>
                                    </div>
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                        <dt className="text-ink-3">Tests/kit</dt>
                                        <dd className="tabular-nums text-ink-2">
                                            {i.tests_per_kit != null ? i.tests_per_kit : '—'}
                                        </dd>
                                        <dt className="text-ink-3">Tests</dt>
                                        <dd className="min-w-0 break-words font-mono text-[10px] uppercase text-ink-2">
                                            {codes.length ? codes.join(', ') : '—'}
                                        </dd>
                                        <dt className="text-ink-3">Qty</dt>
                                        <dd className="tabular-nums text-ink-2">{i.total_quantity}</dd>
                                        <dt className="text-ink-3">Tracked</dt>
                                        <dd className="tabular-nums text-ink-2">{tr}</dd>
                                    </dl>
                                    {i.type === 'kit' ? (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openInspect(i)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-ink-3/30 px-2 py-1 text-xs text-ink-2 hover:bg-surface-muted"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                                Inspect
                                            </button>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })
                    )}
                </ul>
            </DataTableShell>

            <section aria-labelledby="send-stock-heading">
                <h2 id="send-stock-heading" className="sr-only">
                    Send stock to BU
                </h2>
                <form onSubmit={sendStock} className="lab-card p-5 md:p-6 shadow-card">
                    <p className="text-sm font-semibold text-ink mb-4">Send stock to business unit</p>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="min-w-0">
                                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="send-item">
                                    Item
                                </label>
                                <select
                                    id="send-item"
                                    className="lab-input w-full min-h-[2.75rem]"
                                    value={send.item_id}
                                    disabled={items.length === 0}
                                    onChange={(e) => setSend({ ...send, item_id: e.target.value })}
                                >
                                    {items.length === 0 ? (
                                        <option value="">No items — add central stock first</option>
                                    ) : (
                                        items.map((i) => (
                                            <option key={i.id} value={i.id}>
                                                {i.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div className="min-w-0 md:min-w-[12rem]">
                                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="send-bu">
                                    Business unit
                                </label>
                                <select
                                    id="send-bu"
                                    className="lab-input w-full min-h-[2.75rem]"
                                    value={send.bu_id}
                                    disabled={bus.length === 0}
                                    onChange={(e) => setSend({ ...send, bu_id: e.target.value })}
                                >
                                    {bus.length === 0 ? (
                                        <option value="">No business units — create one in Admin</option>
                                    ) : (
                                        bus.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="send-qty">
                                    Quantity
                                </label>
                                <input
                                    id="send-qty"
                                    type="number"
                                    min={1}
                                    className="lab-input w-full"
                                    value={send.quantity}
                                    onChange={(e) => setSend({ ...send, quantity: e.target.value })}
                                />
                                {sendTestsCapacity != null ? (
                                    <p className="mt-1.5 text-xs text-ink-3">
                                        Sending <span className="tabular-nums text-ink-2">{sendQty}</span> kit
                                        {sendQty === 1 ? '' : 's'} ≈{' '}
                                        <span className="font-mono text-ink tabular-nums">
                                            {sendTestsCapacity}
                                        </span>{' '}
                                        tests capacity
                                    </p>
                                ) : null}
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="send-notes">
                                    Notes
                                </label>
                                <input
                                    id="send-notes"
                                    className="lab-input w-full"
                                    value={send.notes}
                                    onChange={(e) => setSend({ ...send, notes: e.target.value })}
                                />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-start">
                                <button
                                    type="submit"
                                    disabled={
                                        sending ||
                                        items.length === 0 ||
                                        bus.length === 0 ||
                                        !send.item_id ||
                                        !send.bu_id
                                    }
                                    className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60"
                                >
                                    {sending ? 'Sending…' : 'Send to BU'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </section>

            <div>
                <button type="button" className="btn-ghost px-4 py-2.5 text-sm" onClick={dailyDeduction}>
                    Apply daily calibration/QC deduction…
                </button>
            </div>

            <DataTableShell title="Per-BU stock" count={byBu.length}>
                <table className="data-table data-table-lab w-full min-w-0 text-xs table-fixed hidden md:table">
                    <colgroup>
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '26%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="pl-5">Item</th>
                            <th>BU</th>
                            <th className="text-right">Qty</th>
                            <th className="text-right">Units</th>
                            <th className="pr-5 text-right">Tests remaining</th>
                        </tr>
                    </thead>
                    <tbody>
                        {byBu.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-ink-3">
                                    No per-BU rows yet.
                                </td>
                            </tr>
                        ) : (
                            byBu.map((r) => (
                                <tr key={r.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-2.5 truncate">{r.item_name}</td>
                                    <td className="py-2.5 truncate">{r.bu_name}</td>
                                    <td className="py-2.5 tabular-nums text-right">{r.quantity}</td>
                                    <td className="py-2.5 text-right tabular-nums text-ink-2">
                                        {r.units_at_bu != null ? r.units_at_bu : '—'}
                                    </td>
                                    <td className="pr-5 py-2.5 text-right tabular-nums text-ink-2">
                                        {r.tests_per_kit == null
                                            ? '—'
                                            : (r.tests_remaining != null ? r.tests_remaining : 0)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <ul className="md:hidden m-0 list-none divide-y divide-rule-soft p-0" aria-label="Per-BU stock (mobile)">
                    {byBu.length === 0 ? (
                        <li className="px-4 py-12 text-center text-ink-3">No per-BU rows yet.</li>
                    ) : (
                        byBu.map((r) => (
                            <li key={r.id} className="px-4 py-3">
                                <div className="mb-1.5 flex items-center justify-between gap-3">
                                    <p className="min-w-0 flex-1 truncate font-medium text-ink" title={r.item_name}>
                                        {r.item_name}
                                    </p>
                                    <span className="shrink-0 font-mono text-eyebrow uppercase text-ink-3">
                                        {r.quantity} qty
                                    </span>
                                </div>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-ink-3">BU</dt>
                                    <dd className="min-w-0 break-words text-ink-2">{r.bu_name}</dd>
                                    <dt className="text-ink-3">Units</dt>
                                    <dd className="tabular-nums text-ink-2">
                                        {r.units_at_bu != null ? r.units_at_bu : '—'}
                                    </dd>
                                    <dt className="text-ink-3">Tests remaining</dt>
                                    <dd className="tabular-nums text-ink-2">
                                        {r.tests_per_kit == null
                                            ? '—'
                                            : r.tests_remaining != null
                                              ? r.tests_remaining
                                              : 0}
                                    </dd>
                                </dl>
                            </li>
                        ))
                    )}
                </ul>
            </DataTableShell>

            <DataTableShell
                title="Recent transactions"
                count={txns.length}
                bodyClassName="max-h-[min(20rem,50vh)] overflow-y-auto"
            >
                <table className="data-table data-table-lab w-full min-w-0 text-xs hidden md:table">
                    <thead>
                        <tr>
                            <th className="pl-5">When</th>
                            <th>Type</th>
                            <th>Item</th>
                            <th>BU</th>
                            <th className="pr-5">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {txns.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-ink-muted">
                                    No transactions yet.
                                </td>
                            </tr>
                        ) : (
                            txns.map((t) => (
                                <tr key={t.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-2.5 whitespace-nowrap">
                                        {new Date(t.created_at).toLocaleString()}
                                    </td>
                                    <td className="py-2.5">{t.type}</td>
                                    <td className="py-2.5">{t.item_name}</td>
                                    <td className="py-2.5">{t.bu_name || '—'}</td>
                                    <td className="pr-5 py-2.5 tabular-nums">{t.quantity}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <ul
                    className="md:hidden m-0 list-none divide-y divide-rule-soft p-0"
                    aria-label="Recent transactions (mobile)"
                >
                    {txns.length === 0 ? (
                        <li className="px-4 py-12 text-center text-ink-muted">No transactions yet.</li>
                    ) : (
                        txns.map((t) => (
                            <li key={t.id} className="px-4 py-3">
                                <div className="mb-1.5 flex items-center justify-between gap-3">
                                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{t.item_name}</p>
                                    <span className="shrink-0 font-mono text-eyebrow uppercase text-ink-3">
                                        {t.type}
                                    </span>
                                </div>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-ink-3">When</dt>
                                    <dd className="text-ink-2">
                                        {new Date(t.created_at).toLocaleString()}
                                    </dd>
                                    <dt className="text-ink-3">BU</dt>
                                    <dd className="min-w-0 break-words text-ink-2">{t.bu_name || '—'}</dd>
                                    <dt className="text-ink-3">Qty</dt>
                                    <dd className="tabular-nums text-ink-2">{t.quantity}</dd>
                                </dl>
                            </li>
                        ))
                    )}
                </ul>
            </DataTableShell>

            {inspectItem ? (
                <div
                    className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-ink/60"
                    role="dialog"
                    aria-label="Kit units in central"
                >
                    <div className="w-full max-w-lg rounded-2xl border border-ink-3/30 bg-surface-elev p-4 shadow-xl max-h-[80vh] overflow-y-auto">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-ink">Central / tracked — {inspectItem.name}</h3>
                            <button
                                type="button"
                                className="text-xs text-ink-2 hover:underline"
                                onClick={() => {
                                    setInspectItem(null);
                                    setInspectUnits([]);
                                }}
                            >
                                Close
                            </button>
                        </div>
                        {inspectLoading ? (
                            <p className="text-sm text-ink-3">Loading…</p>
                        ) : inspectUnits.length === 0 ? (
                            <p className="text-sm text-ink-3">No barcoded units in central for this type.</p>
                        ) : (
                            <ul className="max-h-64 overflow-y-auto font-mono text-xs text-ink-2">
                                {inspectUnits.map((u) => (
                                    <li key={u.id} className="border-b border-ink-3/20 py-1.5">
                                        {u.barcode}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}
        </PageShell>
    );
}
