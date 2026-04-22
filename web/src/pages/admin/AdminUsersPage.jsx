import { useEffect, useState } from 'react';
import { Users, Eye, EyeOff, X, Settings2 } from 'lucide-react';
import { PageShell, DataTableShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export function AdminUsersPage() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [bus, setBus] = useState([]);
    const [error, setError] = useState(null);

    // Create form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [buIds, setBuIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Edit modal
    const [editing, setEditing] = useState(null); // user object or null

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
            setShowCreatePassword(false);
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
            description="Create lab technician accounts and manage existing users -- assignments, passwords, active status."
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
                            <PasswordInput
                                id="u-pass"
                                value={password}
                                onChange={setPassword}
                                show={showCreatePassword}
                                onToggle={() => setShowCreatePassword((v) => !v)}
                                autoComplete="new-password"
                                required
                                minLength={4}
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
                <table className="data-table data-table-lab w-full min-w-[640px]">
                    <thead>
                        <tr>
                            <th className="pl-5">Username</th>
                            <th>Display</th>
                            <th>Role</th>
                            <th>Business units</th>
                            <th>Status</th>
                            <th className="pr-5 text-right">Manage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-muted">
                                    No users yet. Create a lab technician above.
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => {
                                const isMe = me?.id === u.id;
                                return (
                                    <tr key={u.id} className="hover:bg-surface-muted/50 transition-colors">
                                        <td className="pl-5 py-3 text-sm font-medium text-ink">
                                            {u.username}
                                            {isMe ? (
                                                <span className="ml-2 font-mono text-[10px] uppercase text-ink-3">you</span>
                                            ) : null}
                                        </td>
                                        <td className="py-3 text-sm text-ink-secondary">{u.display_name || '—'}</td>
                                        <td className="py-3 text-xs text-ink-muted">{u.role.replace('_', ' ')}</td>
                                        <td className="py-3 text-xs text-ink-secondary">
                                            {(u.businessUnits || []).map((b) => b.name).join(', ') || '—'}
                                        </td>
                                        <td className="py-3 text-xs">
                                            <StatusPill active={u.active} />
                                        </td>
                                        <td className="pr-5 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setEditing(u)}
                                                className="inline-flex items-center gap-1.5 font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 border border-rule-soft text-ink-2 hover:text-ink hover:border-ink transition-colors"
                                            >
                                                <Settings2 className="w-3 h-3" strokeWidth={2} aria-hidden />
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </DataTableShell>

            {editing ? (
                <EditUserModal
                    key={editing.id}
                    user={editing}
                    bus={bus}
                    isSelf={me?.id === editing.id}
                    onClose={() => setEditing(null)}
                    onSaved={async () => {
                        await load();
                        setEditing(null);
                    }}
                />
            ) : null}
        </PageShell>
    );
}

// --- Status pill ---------------------------------------------------------

function StatusPill({ active }) {
    return active ? (
        <span className="inline-flex items-center gap-1.5 font-mono uppercase text-[10px] tracking-wider text-signal-success">
            <span className="block w-1.5 h-1.5 rounded-full bg-signal-success" aria-hidden />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 font-mono uppercase text-[10px] tracking-wider text-ink-3">
            <span className="block w-1.5 h-1.5 rounded-full bg-ink-3" aria-hidden />
            Disabled
        </span>
    );
}

// --- Password input with show/hide ---------------------------------------

function PasswordInput({ id, value, onChange, show, onToggle, autoComplete, required, minLength, placeholder }) {
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                className="lab-input w-full pr-12"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                required={required}
                minLength={minLength}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={onToggle}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink focus:outline-none focus-visible:text-ink transition-colors"
            >
                {show ? <EyeOff className="w-4 h-4" strokeWidth={1.75} aria-hidden /> : <Eye className="w-4 h-4" strokeWidth={1.75} aria-hidden />}
            </button>
        </div>
    );
}

// --- Edit user modal -----------------------------------------------------

function EditUserModal({ user, bus, isSelf, onClose, onSaved }) {
    const [displayName, setDisplayName] = useState(user.display_name || '');
    const [active, setActive] = useState(Boolean(user.active));
    const [editBuIds, setEditBuIds] = useState((user.businessUnits || []).map((b) => b.id));
    const [pw, setPw] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showPwConfirm, setShowPwConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    const toggleBu = (id) => {
        setEditBuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const save = async (e) => {
        e.preventDefault();
        setErr(null);

        if (pw || pwConfirm) {
            if (pw !== pwConfirm) {
                setErr('Passwords do not match.');
                return;
            }
            if (pw.length < 4) {
                setErr('Password must be at least 4 characters.');
                return;
            }
        }

        setBusy(true);
        try {
            const body = {
                display_name: displayName.trim(),
                bu_ids: editBuIds
            };
            // Only include `active` if it actually changed -- avoids the
            // self-deactivation guard firing on a no-op self-edit.
            if (active !== user.active) body.active = active;
            if (pw) body.password = pw;

            const res = await apiFetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not save user');
            await onSaved();
        } catch (e2) {
            setErr(e2.message || String(e2));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-surface border border-rule-soft shadow-card max-h-[92dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between border-b border-rule-soft px-5 py-3 bg-surface-2">
                    <div className="min-w-0">
                        <p className="font-mono uppercase text-eyebrow text-ink-3">Edit user</p>
                        <h2 id="edit-user-title" className="text-sm font-semibold text-ink truncate">
                            {user.username}
                            <span className="ml-2 font-mono text-[10px] uppercase text-ink-3">
                                {user.role.replace('_', ' ')}
                            </span>
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 text-ink-3 hover:text-ink transition-colors"
                    >
                        <X className="w-4 h-4" strokeWidth={2} aria-hidden />
                    </button>
                </header>

                <form onSubmit={save} className="p-5 space-y-5">
                    {err ? (
                        <div className="border border-signal-danger bg-signal-danger/10 px-3 py-2">
                            <p className="text-xs text-signal-danger">{err}</p>
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="e-display">
                            Display name
                        </label>
                        <input
                            id="e-display"
                            className="lab-input w-full"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>

                    <fieldset className="border-0 p-0 m-0 min-w-0">
                        <legend className="text-xs font-medium text-ink-secondary mb-2">Business units</legend>
                        {bus.length === 0 ? (
                            <p className="text-xs text-ink-muted">No active business units.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {bus.map((b) => {
                                    const on = editBuIds.includes(b.id);
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => toggleBu(b.id)}
                                            className={`text-left px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
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

                    <div>
                        <p className="text-xs font-medium text-ink-secondary mb-2">Status</p>
                        <label
                            className={`flex items-center gap-3 px-3 py-2.5 border ${
                                active ? 'border-rule-soft' : 'border-signal-danger/40 bg-signal-danger/5'
                            } ${isSelf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <input
                                type="checkbox"
                                checked={active}
                                disabled={isSelf}
                                onChange={(e) => setActive(e.target.checked)}
                                className="accent-primary"
                            />
                            <span className="text-sm text-ink">
                                {active ? 'Account is active' : 'Account is disabled (cannot sign in)'}
                            </span>
                        </label>
                        {isSelf ? (
                            <p className="mt-1.5 text-[11px] text-ink-muted">
                                You cannot deactivate your own account. Ask another super admin if you need to.
                            </p>
                        ) : null}
                    </div>

                    <fieldset className="border border-rule-soft p-4 space-y-3">
                        <legend className="px-2 font-mono uppercase text-[10px] tracking-wider text-ink-3">
                            Change password
                        </legend>
                        <p className="text-[11px] text-ink-muted -mt-1">
                            Leave blank to keep the current password. Minimum 4 characters.
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="e-pw">
                                New password
                            </label>
                            <PasswordInput
                                id="e-pw"
                                value={pw}
                                onChange={setPw}
                                show={showPw}
                                onToggle={() => setShowPw((v) => !v)}
                                autoComplete="new-password"
                                placeholder="Leave blank to keep current"
                            />
                        </div>
                        <div>
                            <label
                                className="block text-xs font-medium text-ink-secondary mb-1.5"
                                htmlFor="e-pw-confirm"
                            >
                                Confirm new password
                            </label>
                            <PasswordInput
                                id="e-pw-confirm"
                                value={pwConfirm}
                                onChange={setPwConfirm}
                                show={showPwConfirm}
                                onToggle={() => setShowPwConfirm((v) => !v)}
                                autoComplete="new-password"
                                placeholder="Re-enter new password"
                            />
                        </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-rule-soft">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="px-4 py-2 text-sm font-mono uppercase text-eyebrow text-ink-2 border border-rule-soft hover:text-ink hover:border-ink transition-colors disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="btn-primary py-2 px-5 text-sm disabled:opacity-60"
                        >
                            {busy ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
