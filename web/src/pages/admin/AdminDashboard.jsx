import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    Boxes,
    ClipboardCheck,
    Factory,
    LayoutGrid,
    Link2,
    Package,
    SlidersHorizontal,
    Users,
    Warehouse
} from 'lucide-react';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

const METRICS = [
    {
        key: 'businessUnits',
        label: 'Business units',
        hint: 'Active labs',
        icon: Factory
    },
    {
        key: 'machines',
        label: 'Machines',
        hint: 'Onboarded instruments',
        icon: Boxes
    },
    {
        key: 'kits',
        label: 'Kits',
        hint: 'Reagent kits',
        icon: Package
    },
    {
        key: 'parameters',
        label: 'Parameters',
        hint: 'Mapped analytes',
        icon: SlidersHorizontal
    },
    {
        key: 'inventoryItems',
        label: 'Inventory items',
        hint: 'Stock lines',
        icon: Warehouse
    }
];

const QUICK_LINKS = [
    {
        to: '/admin/analytics',
        title: 'Analytics',
        description: 'Insights hub — Teller volume, validation, inventory',
        icon: BarChart3
    },
    {
        to: '/admin/bus',
        title: 'Business units',
        description: 'Create and manage tenant labs',
        icon: Factory
    },
    {
        to: '/admin/machines',
        title: 'Machines',
        description: 'Instrument onboarding and BU assignment',
        icon: Boxes
    },
    {
        to: '/admin/kits',
        title: 'Kits',
        description: 'Kit catalog and composition',
        icon: Package
    },
    {
        to: '/admin/parameters',
        title: 'Parameters',
        description: 'Analyte definitions and codes',
        icon: SlidersHorizontal
    },
    {
        to: '/admin/parameters/mapping',
        title: 'Parameter mapping',
        description: 'Visual flow between kits and parameters',
        icon: Link2
    },
    {
        to: '/admin/users',
        title: 'Users',
        description: 'Accounts and BU access',
        icon: Users
    },
    {
        to: '/admin/inventory',
        title: 'Inventory',
        description: 'Stock, allocations, and alerts',
        icon: Warehouse
    },
    {
        to: '/admin/validation',
        title: 'Validation',
        description: 'Daily Teller (LIS) vs lab counts',
        icon: ClipboardCheck
    }
];

export function AdminDashboard() {
    const [counts, setCounts] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch('/api/admin/dashboard');
                const d = await res.json();
                if (!res.ok) throw new Error(d.error || 'Failed');
                setCounts(d.counts);
            } catch (e) {
                setError(e.message || String(e));
            }
        })();
    }, []);

    return (
        <PageShell
            badge="Super admin"
            badgeIcon={LayoutGrid}
            title="Admin overview"
            description="Snapshot of platform configuration. Use the shortcuts below to manage business units, instruments, catalog data, and operations."
            error={error}
        >
            <div className="space-y-10">
                <section aria-labelledby="metrics-heading">
                    <h2 id="metrics-heading" className="sr-only">
                        Key metrics
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {METRICS.map(({ key, label, hint, icon: Icon }) => (
                            <div
                                key={key}
                                className="lab-card group hover:shadow-card-hover transition-shadow duration-200"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
                                        aria-hidden
                                    >
                                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                                    </div>
                                </div>
                                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                                    {label}
                                </p>
                                <p className="text-3xl font-bold tabular-nums text-ink mt-0.5">
                                    {counts != null && typeof counts[key] === 'number' ? counts[key] : '—'}
                                </p>
                                <p className="text-xs text-ink-muted mt-1">{hint}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="quick-heading" className="space-y-4">
                    <div>
                        <h2 id="quick-heading" className="font-display text-lg font-semibold text-ink">
                            Quick access
                        </h2>
                        <p className="text-sm text-ink-muted mt-0.5">
                            Jump to admin tools — same destinations as the sidebar.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {QUICK_LINKS.map(({ to, title, description, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className="group flex items-start gap-4 rounded-2xl border border-border bg-white/95 p-4 shadow-card transition-all duration-200 hover:border-primary/25 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            >
                                <span
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-secondary group-hover:bg-primary-soft group-hover:text-primary transition-colors"
                                    aria-hidden
                                >
                                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1 font-semibold text-ink group-hover:text-primary transition-colors">
                                        {title}
                                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                    </span>
                                    <span className="block text-xs text-ink-muted mt-0.5 leading-relaxed">
                                        {description}
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </PageShell>
    );
}
