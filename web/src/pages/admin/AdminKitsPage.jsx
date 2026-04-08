import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminKitsPage() {
    const [kits, setKits] = useState([]);
    const [machines, setMachines] = useState([]);
    const [compat, setCompat] = useState([]);
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        const [kr, mr, cr] = await Promise.all([
            apiFetch('/api/admin/kits'),
            apiFetch('/api/admin/machines'),
            apiFetch('/api/admin/kit-machine-compat')
        ]);
        const k = await kr.json();
        const m = await mr.json();
        const c = await cr.json();
        if (!kr.ok) throw new Error(k.error);
        setKits(k.kits || []);
        setMachines(m.machines || []);
        setCompat(c.compat || []);
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
    }, []);

    const addKit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/admin/kits', { method: 'POST', body: JSON.stringify({ name }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not add kit');
            setName('');
            await load();
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    const addCompat = async (kitId, machineId) => {
        setError(null);
        try {
            const res = await apiFetch('/api/admin/kit-machine-compat', {
                method: 'POST',
                body: JSON.stringify({ kit_id: kitId, machine_id: machineId })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Link failed');
            await load();
        } catch (err) {
            setError(err.message || String(err));
        }
    };

    return (
        <PageShell
            badge="Admin · Catalog"
            badgeIcon={Package}
            title="Kits"
            description="Define reagent kits and link them to machines for compatibility and lab workflows."
            error={error}
        >
            <section aria-labelledby="add-kit-heading">
                <h2 id="add-kit-heading" className="sr-only">
                    Add kit
                </h2>
                <form onSubmit={addKit} className="lab-card p-5 md:p-6 shadow-card">
                    <p className="text-sm font-semibold text-ink mb-4">New kit</p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="kit-name"
                            >
                                Kit name
                            </label>
                            <input
                                id="kit-name"
                                className="lab-input w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Dual Marker Kit"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary py-2.5 px-6 text-sm sm:shrink-0 disabled:opacity-60"
                        >
                            {submitting ? 'Adding…' : 'Add kit'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="lab-card p-5 md:p-6 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-4">
                    <h2 className="font-display text-sm font-semibold text-ink">Kit ↔ machine compatibility</h2>
                    <span className="text-xs text-ink-muted tabular-nums">{compat.length} active pairs</span>
                </div>
                <p className="text-xs text-ink-muted mb-4">
                    For each kit, choose a machine to create a compatible pair.
                </p>
                {kits.length === 0 ? (
                    <p className="text-sm text-ink-muted py-6 text-center">Add a kit first.</p>
                ) : (
                    <div className="space-y-3">
                        {kits.map((kit) => (
                            <div
                                key={kit.id}
                                className="flex flex-wrap gap-3 items-center border-b border-border last:border-0 pb-3 last:pb-0"
                            >
                                <span className="font-medium text-sm text-ink min-w-[10rem]">{kit.name}</span>
                                <select
                                    className="lab-input text-sm py-2 max-w-xs flex-1 min-w-[12rem]"
                                    defaultValue=""
                                    aria-label={`Link machine for ${kit.name}`}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addCompat(kit.id, e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                >
                                    <option value="">+ Link machine…</option>
                                    {machines.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </PageShell>
    );
}
