import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [bus, setBus] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [buIds, setBuIds] = useState([]);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        const [ur, br] = await Promise.all([apiFetch('/api/admin/users'), apiFetch('/api/admin/business-units')]);
        const u = await ur.json();
        const b = await br.json();
        if (!ur.ok) throw new Error(u.error);
        setUsers(u.users || []);
        setBus(b.businessUnits?.filter((x) => x.active) || []);
    };

    useEffect(() => {
        load().catch((e) => setError(e.message));
    }, []);

    const toggleBu = (id) => {
        setBuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const create = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password,
                    display_name: displayName,
                    role: 'lab_technician',
                    bu_ids: buIds
                })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not create user');
            setUsername('');
            setPassword('');
            setDisplayName('');
            setBuIds([]);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageShell
            badge="Admin · Access"
            badgeIcon={Users}
            title="Users"
            description="Create lab technician accounts and assign one or more business units for data entry scope."
            error={error}
        >
            <section aria-labelledby="create-user-heading">
                <h2 id="create-user-heading" className="sr-only">
                    Create lab technician
                </h2>
                <form onSubmit={create} className="lab-card p-5 md:p-6 shadow-card space-y-5">
                    <p className="text-sm font-semibold text-ink">New lab technician</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="u-name"
                            >
                                Username
                            </label>
                            <input
                                id="u-name"
                                className="lab-input w-full"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>
                        <div>
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="u-pass"
                            >
                                Password
                            </label>
                            <input
                                id="u-pass"
                                type="password"
                                className="lab-input w-full"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="u-display"
                            >
                                Display name
                            </label>
                            <input
                                id="u-display"
                                className="lab-input w-full"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <fieldset className="border-0 p-0 m-0 min-w-0">
                        <legend className="text-xs font-medium text-ink-secondary mb-2">Assign business units</legend>
                        <p id="bu-assign-hint" className="text-[11px] text-ink-muted mb-3">
                            Choose one or more units. The technician can only enter data for machines in these units.
                        </p>
                        {bus.length === 0 ? (
                            <p className="text-sm text-ink-muted rounded-lg border border-dashed border-border bg-surface-muted/50 px-4 py-3">
                                No active business units yet. Create one under Business units first.
                            </p>
                        ) : (
                            <div
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                                role="group"
                                aria-describedby="bu-assign-hint"
                            >
                                {bus.map((b) => {
                                    const on = buIds.includes(b.id);
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => toggleBu(b.id)}
                                            className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                                                on
                                                    ? 'bg-primary text-white border-primary shadow-sm'
                                                    : 'border-border text-ink-secondary bg-white hover:bg-surface-muted hover:border-border-strong'
                                            }`}
                                        >
                                            {b.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </fieldset>
                    <button type="submit" disabled={submitting} className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60">
                        {submitting ? 'Creating…' : 'Create lab technician'}
                    </button>
                </form>
            </section>

            <DataTableShell title="All users" count={users.length}>
                <table className="data-table data-table-lab w-full min-w-[480px]">
                    <thead>
                        <tr>
                            <th className="pl-5">Username</th>
                            <th>Display</th>
                            <th>Role</th>
                            <th className="pr-5">Business units</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No users yet. Create a lab technician above.
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="pl-5 py-3 text-sm font-medium text-ink">{u.username}</td>
                                    <td className="py-3 text-sm text-ink-secondary">{u.display_name}</td>
                                    <td className="py-3 text-xs text-ink-muted">{u.role.replace('_', ' ')}</td>
                                    <td className="pr-5 py-3 text-xs text-ink-secondary">
                                        {(u.businessUnits || []).map((b) => b.name).join(', ') || '—'}
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
