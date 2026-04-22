import { useEffect, useState } from 'react';
import { Factory } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminBuPage() {
    const [rows, setRows] = useState([]);
    const [name, setName] = useState('');
    const [badge, setBadge] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [editName, setEditName] = useState('');
    const [editBadge, setEditBadge] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const load = async () => {
        const res = await apiFetch('/api/admin/business-units');
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setRows(d.businessUnits || []);
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
    }, []);

    const add = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/admin/business-units', {
                method: 'POST',
                body: JSON.stringify({ name, badge })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not add business unit');
            setName('');
            setBadge('');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggle = async (id, active) => {
        setError(null);
        try {
            const res = await apiFetch(`/api/admin/business-units/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !active })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Update failed');
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEdit = (r) => {
        setError(null);
        setEditRow(r);
        setEditName(r.name);
        setEditBadge(r.badge ?? '');
    };

    const closeEdit = () => {
        setEditRow(null);
        setEditSaving(false);
    };

    useEffect(() => {
        if (!editRow) return;
        const onKey = (e) => {
            if (e.key === 'Escape') closeEdit();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editRow]);

    const saveEdit = async (e) => {
        e.preventDefault();
        if (!editRow) return;
        const trimmedName = editName.trim();
        if (!trimmedName) {
            setError('Name is required');
            return;
        }
        setError(null);
        setEditSaving(true);
        try {
            const res = await apiFetch(`/api/admin/business-units/${editRow.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: trimmedName, badge: editBadge.trim() })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not update business unit');
            await load();
            closeEdit();
        } catch (err) {
            setError(err.message);
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <PageShell
            badge="Admin · Tenants"
            badgeIcon={Factory}
            title="Business units"
            description="Tenant labs and short badges used across machines, inventory, and lab access."
            error={error}
        >
            <section aria-labelledby="add-bu-heading">
                <h2 id="add-bu-heading" className="sr-only">
                    Add business unit
                </h2>
                <form onSubmit={add} className="lab-card p-5 md:p-6 shadow-card">
                    <p className="text-sm font-semibold text-ink mb-4">New business unit</p>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 md:items-end">
                        <div className="md:col-span-5">
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="bu-name"
                            >
                                Name
                            </label>
                            <input
                                id="bu-name"
                                className="lab-input w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. QUGEN Lab"
                                required
                            />
                        </div>
                        <div className="md:col-span-5">
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="bu-badge"
                            >
                                Badge
                            </label>
                            <input
                                id="bu-badge"
                                className="lab-input w-full font-mono text-sm"
                                value={badge}
                                onChange={(e) => setBadge(e.target.value)}
                                placeholder="e.g. QUGEN"
                            />
                        </div>
                        <div className="md:col-span-2 flex md:justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-primary w-full md:w-auto px-6 py-2.5 text-sm whitespace-nowrap disabled:opacity-60"
                            >
                                {submitting ? 'Adding…' : 'Add'}
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            {editRow ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-bu-title"
                    onMouseDown={(ev) => {
                        if (ev.target === ev.currentTarget) closeEdit();
                    }}
                >
                    <div
                        className="relative w-full max-w-md p-5 md:p-6 bg-surface border-2 border-ink"
                        onMouseDown={(ev) => ev.stopPropagation()}
                    >
                        <h2 id="edit-bu-title" className="text-base font-semibold text-ink mb-1">
                            Edit business unit
                        </h2>
                        <p className="text-xs text-ink-muted mb-4 font-mono truncate" title={editRow.id}>
                            ID: {editRow.id}
                        </p>
                        <form onSubmit={saveEdit} className="space-y-4">
                            <div>
                                <label
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                    htmlFor="edit-bu-name"
                                >
                                    Name
                                </label>
                                <input
                                    id="edit-bu-name"
                                    className="lab-input w-full"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                    htmlFor="edit-bu-badge"
                                >
                                    Badge
                                </label>
                                <input
                                    id="edit-bu-badge"
                                    className="lab-input w-full font-mono text-sm"
                                    value={editBadge}
                                    onChange={(e) => setEditBadge(e.target.value)}
                                    placeholder="Short code (optional)"
                                />
                                <p className="text-[10px] text-ink-muted mt-1.5">
                                    Leave empty to clear the badge. Active status is still toggled from the table.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink rounded-lg border border-border hover:bg-surface-muted"
                                    onClick={closeEdit}
                                    disabled={editSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSaving}
                                    className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
                                >
                                    {editSaving ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            <DataTableShell title="All business units" count={rows.length}>
                <table className="data-table data-table-lab w-full min-w-0">
                    <thead>
                        <tr>
                            <th className="pl-5">Name</th>
                            <th className="hidden md:table-cell">Badge</th>
                            <th className="hidden md:table-cell">Active</th>
                            <th className="pr-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No business units yet. Add one above.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-3 text-sm font-medium text-ink">{r.name}</td>
                                    <td className="hidden py-3 font-mono text-xs text-ink-secondary md:table-cell">
                                        {r.badge || '—'}
                                    </td>
                                    <td className="hidden py-3 text-sm text-ink-secondary md:table-cell">
                                        {r.active ? 'Yes' : 'No'}
                                    </td>
                                    <td className="pr-5 py-3 text-right">
                                        <div className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                                            <button
                                                type="button"
                                                className="text-xs font-medium text-primary hover:underline"
                                                onClick={() => openEdit(r)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="text-xs font-medium text-primary hover:underline"
                                                onClick={() => toggle(r.id, r.active)}
                                            >
                                                Toggle
                                            </button>
                                        </div>
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
