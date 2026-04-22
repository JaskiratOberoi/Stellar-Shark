import { useEffect, useMemo, useState } from 'react';
import { Warehouse } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';
import { TestCodeMultiPicks } from '../../components/lab/TestCodeMultiPicks.jsx';

export function AdminInventoryPage() {
    const [items, setItems] = useState([]);
    const [byBu, setByBu] = useState([]);
    const [bus, setBus] = useState([]);
    const [txns, setTxns] = useState([]);
    const [form, setForm] = useState({
        type: 'kit',
        name: '',
        total_quantity: 0,
        tests_per_kit: '',
        supported_test_codes: []
    });
    const [send, setSend] = useState({ item_id: '', bu_id: '', quantity: 1, notes: '' });
    const [error, setError] = useState(null);
    const [addingItem, setAddingItem] = useState(false);
    const [sending, setSending] = useState(false);

    const load = async () => {
        const [ir, br, bur, tr] = await Promise.all([
            apiFetch('/api/admin/inventory/items'),
            apiFetch('/api/admin/business-units'),
            apiFetch('/api/admin/inventory/by-bu'),
            apiFetch('/api/admin/inventory/transactions?limit=100')
        ]);
        const i = await ir.json();
        const b = await br.json();
        const bu = await bur.json();
        const t = await tr.json();
        if (!ir.ok) throw new Error(i.error);
        setItems(i.items || []);
        setBus(b.businessUnits || []);
        setByBu(bu.rows || []);
        setTxns(t.transactions || []);
        if (!send.bu_id && b.businessUnits?.[0]) setSend((s) => ({ ...s, bu_id: b.businessUnits[0].id }));
        if (!send.item_id && i.items?.[0]) setSend((s) => ({ ...s, item_id: i.items[0].id }));
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            setForm({
                type: 'kit',
                name: '',
                total_quantity: 0,
                tests_per_kit: '',
                supported_test_codes: []
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
            {lowRows.length ? (
                <div className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-ink shadow-sm">
                    <strong className="font-semibold">Low stock</strong>
                    <span className="text-ink-secondary">
                        {' '}
                        {lowRows.map((r) => `${r.item_name} @ ${r.bu_name} (${r.quantity})`).join('; ')}
                    </span>
                </div>
            ) : null}

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
                                            ? { tests_per_kit: '', supported_test_codes: [] }
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
                <table className="data-table data-table-lab w-full min-w-[640px] table-fixed">
                    <colgroup>
                        <col style={{ width: '26%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="pl-5">Name</th>
                            <th>Type</th>
                            <th className="text-right">Tests/kit</th>
                            <th>Tests</th>
                            <th className="pr-5 text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-3">
                                    No central items yet.
                                </td>
                            </tr>
                        ) : (
                            items.map((i) => {
                                const codes = Array.isArray(i.supported_test_codes)
                                    ? i.supported_test_codes
                                    : [];
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
                                        <td className="pr-5 py-3 text-sm tabular-nums text-right">{i.total_quantity}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
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
                <table className="data-table data-table-lab text-xs w-full min-w-[560px] table-fixed">
                    <colgroup>
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '25%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="pl-5">Item</th>
                            <th>BU</th>
                            <th className="text-right">Qty</th>
                            <th className="pr-5 text-right">Tests remaining</th>
                        </tr>
                    </thead>
                    <tbody>
                        {byBu.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-12 text-center text-ink-3">
                                    No per-BU rows yet.
                                </td>
                            </tr>
                        ) : (
                            byBu.map((r) => (
                                <tr key={r.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-2.5 truncate">{r.item_name}</td>
                                    <td className="py-2.5 truncate">{r.bu_name}</td>
                                    <td className="py-2.5 tabular-nums text-right">{r.quantity}</td>
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
            </DataTableShell>

            <DataTableShell
                title="Recent transactions"
                count={txns.length}
                bodyClassName="max-h-[min(20rem,50vh)] overflow-y-auto"
            >
                <table className="data-table data-table-lab text-xs w-full min-w-[480px]">
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
            </DataTableShell>
        </PageShell>
    );
}
