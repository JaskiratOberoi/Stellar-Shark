import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminMachinesPage() {
    const [machines, setMachines] = useState([]);
    const [bus, setBus] = useState([]);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        model: '',
        bu_id: '',
        calibration_kits_per_day: 0,
        qc_kits_per_day: 0,
        calibration_item_id: '',
        qc_item_id: ''
    });

    const load = async () => {
        const [mr, br, ir] = await Promise.all([
            apiFetch('/api/admin/machines'),
            apiFetch('/api/admin/business-units'),
            apiFetch('/api/admin/inventory/items')
        ]);
        const m = await mr.json();
        const b = await br.json();
        const inv = await ir.json();
        if (!mr.ok) throw new Error(m.error);
        setMachines(m.machines || []);
        setBus(b.businessUnits?.filter((x) => x.active) || []);
        setItems(inv.items || []);
        if (!form.bu_id && b.businessUnits?.[0]) {
            setForm((f) => ({ ...f, bu_id: b.businessUnits[0].id }));
        }
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/admin/machines', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    calibration_item_id: form.calibration_item_id || null,
                    qc_item_id: form.qc_item_id || null
                })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not onboard machine');
            setForm((f) => ({
                ...f,
                name: '',
                model: ''
            }));
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageShell
            badge="Admin · Operations"
            badgeIcon={Boxes}
            title="Machines"
            description="Onboard instruments, assign them to a business unit, and link optional calibration or QC inventory items."
            error={error}
        >
            <section aria-labelledby="machine-form-heading">
                <h2 id="machine-form-heading" className="sr-only">
                    Onboard machine
                </h2>
                <form onSubmit={submit} className="lab-card p-5 md:p-6 shadow-card space-y-5">
                    <p className="text-sm font-semibold text-ink">New machine</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="m-name">
                                Name
                            </label>
                            <input
                                id="m-name"
                                className="lab-input w-full"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="m-model">
                                Model
                            </label>
                            <input
                                id="m-model"
                                className="lab-input w-full"
                                value={form.model}
                                onChange={(e) => setForm({ ...form, model: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="m-bu">
                                Business unit
                            </label>
                            <select
                                id="m-bu"
                                className="lab-input w-full"
                                value={form.bu_id}
                                onChange={(e) => setForm({ ...form, bu_id: e.target.value })}
                            >
                                {bus.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                    htmlFor="m-cal"
                                >
                                    Cal. kits / day
                                </label>
                                <input
                                    id="m-cal"
                                    type="number"
                                    min={0}
                                    className="lab-input w-full"
                                    value={form.calibration_kits_per_day}
                                    onChange={(e) =>
                                        setForm({ ...form, calibration_kits_per_day: Number(e.target.value) })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="m-qc">
                                    QC kits / day
                                </label>
                                <input
                                    id="m-qc"
                                    type="number"
                                    min={0}
                                    className="lab-input w-full"
                                    value={form.qc_kits_per_day}
                                    onChange={(e) => setForm({ ...form, qc_kits_per_day: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="m-cali">
                                Calibration inventory item{' '}
                                <span className="text-ink-faint font-normal">(optional)</span>
                            </label>
                            <select
                                id="m-cali"
                                className="lab-input w-full"
                                value={form.calibration_item_id}
                                onChange={(e) => setForm({ ...form, calibration_item_id: e.target.value })}
                            >
                                <option value="">—</option>
                                {items.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="m-qci">
                                QC inventory item <span className="text-ink-faint font-normal">(optional)</span>
                            </label>
                            <select
                                id="m-qci"
                                className="lab-input w-full"
                                value={form.qc_item_id}
                                onChange={(e) => setForm({ ...form, qc_item_id: e.target.value })}
                            >
                                <option value="">—</option>
                                {items.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={submitting} className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60">
                            {submitting ? 'Saving…' : 'Onboard machine'}
                        </button>
                    </div>
                </form>
            </section>

            <DataTableShell title="All machines" count={machines.length}>
                <table className="data-table data-table-lab w-full min-w-0">
                    <thead>
                        <tr>
                            <th className="pl-5">Name</th>
                            <th className="hidden md:table-cell">Model</th>
                            <th>BU</th>
                            <th className="pr-5">Cal / QC per day</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No machines yet. Onboard one using the form above.
                                </td>
                            </tr>
                        ) : (
                            machines.map((m) => (
                                <tr key={m.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-3 text-sm font-medium text-ink">{m.name}</td>
                                    <td className="hidden py-3 text-sm text-ink-secondary md:table-cell">{m.model}</td>
                                    <td className="py-3 text-sm text-ink-secondary">{m.bu_name}</td>
                                    <td className="pr-5 py-3 text-sm tabular-nums text-ink-secondary">
                                        {m.calibration_kits_per_day} / {m.qc_kits_per_day}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </DataTableShell>
        </PageShell>
    );
}
