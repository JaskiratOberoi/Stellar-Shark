import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, SlidersHorizontal } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminParametersPage() {
    const [parameters, setParameters] = useState([]);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        const res = await apiFetch('/api/admin/parameters');
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setParameters(d.parameters || []);
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
    }, []);

    const add = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/admin/parameters', {
                method: 'POST',
                body: JSON.stringify({ name, code: code || null })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not add parameter');
            setName('');
            setCode('');
            await load();
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageShell
            badge="Admin · Catalog"
            badgeIcon={SlidersHorizontal}
            title="Parameters"
            description="Define analytes and optional codes for kits and lab workflows. Use visual mapping to connect kits to parameters."
            error={error}
            headerAction={
                <Link
                    to="/admin/parameters/mapping"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                    <Link2 className="w-4 h-4 opacity-90" aria-hidden />
                    Visual mapping
                </Link>
            }
        >
            <section aria-labelledby="add-param-heading">
                <h2 id="add-param-heading" className="sr-only">
                    Add parameter
                </h2>
                <form onSubmit={add} className="lab-card p-5 md:p-6 shadow-card">
                    <p className="text-sm font-semibold text-ink mb-4">New parameter</p>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 md:items-end">
                        <div className="md:col-span-5">
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="param-name"
                            >
                                Name
                            </label>
                            <input
                                id="param-name"
                                className="lab-input w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. PAPP-A"
                                required
                            />
                        </div>
                        <div className="md:col-span-5">
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="param-code"
                            >
                                Code <span className="text-ink-faint font-normal">(optional)</span>
                            </label>
                            <input
                                id="param-code"
                                className="lab-input w-full font-mono text-sm"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="e.g. PAPP_A"
                            />
                        </div>
                        <div className="md:col-span-2 flex md:justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-primary w-full md:w-auto px-6 py-2.5 text-sm whitespace-nowrap disabled:opacity-60"
                            >
                                {submitting ? 'Adding…' : 'Add parameter'}
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <DataTableShell title="All parameters" count={parameters.length}>
                <table className="data-table data-table-lab w-full min-w-[320px]">
                    <thead>
                        <tr>
                            <th className="pl-5">Name</th>
                            <th className="pr-5">Code</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No parameters yet. Add one above to get started.
                                </td>
                            </tr>
                        ) : (
                            parameters.map((p) => (
                                <tr key={p.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-3 text-sm text-ink font-medium">{p.name}</td>
                                    <td className="pr-5 py-3 font-mono text-xs text-ink-secondary">
                                        {p.code || '—'}
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
