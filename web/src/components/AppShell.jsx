import { NavLink, Outlet } from 'react-router-dom';
import {
    Activity,
    BarChart3,
    Boxes,
    ClipboardList,
    Factory,
    LayoutDashboard,
    Link2,
    LogOut,
    Package,
    Shield,
    Users,
    Warehouse
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const navLinkClass = ({ isActive }) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        isActive
            ? 'bg-ink text-white shadow-md'
            : 'text-ink-secondary hover:bg-surface-muted hover:text-ink'
    }`;

const sideIconClass = ({ isActive }) =>
    `p-2.5 rounded-xl transition-colors ${
        isActive ? 'bg-ink text-white shadow-md' : 'text-ink-muted hover:bg-white hover:text-ink'
    }`;

export function AppShell() {
    const { user, logout } = useAuth();
    const showAdmin = user?.role === 'super_admin';
    const showLab = user?.role === 'lab_technician';

    return (
        <div className="min-h-dvh flex flex-col bg-surface-muted text-ink">
            <header className="shrink-0 z-20 border-b border-border bg-white/95 backdrop-blur-md shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-8 max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-6">
                        <NavLink to="/" className="font-display font-bold text-lg text-ink tracking-tight">
                            Nexus
                        </NavLink>
                        <nav className="hidden md:flex flex-wrap items-center gap-1" aria-label="Modules">
                            <NavLink to="/teller/dashboard" className={navLinkClass}>
                                <Activity className="w-4 h-4" aria-hidden />
                                Teller
                            </NavLink>
                            {showLab ? (
                                <>
                                    <NavLink to="/lab/entry" className={navLinkClass}>
                                        <ClipboardList className="w-4 h-4" aria-hidden />
                                        Lab entry
                                    </NavLink>
                                    <NavLink to="/lab/history" className={navLinkClass}>
                                        <ClipboardList className="w-4 h-4" aria-hidden />
                                        History
                                    </NavLink>
                                </>
                            ) : null}
                            {showAdmin ? (
                                <>
                                    <NavLink to="/admin/analytics" className={navLinkClass}>
                                        <BarChart3 className="w-4 h-4" aria-hidden />
                                        Analytics
                                    </NavLink>
                                    <NavLink to="/admin/inventory" className={navLinkClass}>
                                        <Warehouse className="w-4 h-4" aria-hidden />
                                        Inventory
                                    </NavLink>
                                    <NavLink to="/admin/dashboard" className={navLinkClass}>
                                        <Shield className="w-4 h-4" aria-hidden />
                                        Admin
                                    </NavLink>
                                </>
                            ) : null}
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <span className="text-xs text-ink-muted hidden sm:inline">
                                    {user.displayName || user.username}
                                    <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink px-3 py-2 rounded-full border border-border hover:bg-surface-muted"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <span className="text-xs text-ink-muted">Guest mode</span>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 min-h-0 min-w-0">
                <aside
                    className="hidden lg:flex w-[72px] shrink-0 flex-col items-center py-6 gap-2 border-r border-border bg-white/90"
                    aria-label="Quick navigation"
                >
                    <NavLink to="/teller/dashboard" className={sideIconClass} title="Teller">
                        <Activity className="w-5 h-5" />
                    </NavLink>
                    {showLab ? (
                        <NavLink to="/lab/entry" className={sideIconClass} title="Lab entry">
                            <ClipboardList className="w-5 h-5" />
                        </NavLink>
                    ) : null}
                    {showAdmin ? (
                        <>
                            <NavLink to="/admin/analytics" className={sideIconClass} title="Analytics">
                                <BarChart3 className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/inventory" className={sideIconClass} title="Inventory">
                                <Warehouse className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/dashboard" className={sideIconClass} title="Admin">
                                <LayoutDashboard className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/bus" className={sideIconClass} title="BUs">
                                <Factory className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/machines" className={sideIconClass} title="Machines">
                                <Boxes className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/kits" className={sideIconClass} title="Kits">
                                <Package className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/parameters" className={sideIconClass} title="Parameters">
                                <Link2 className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/users" className={sideIconClass} title="Users">
                                <Users className="w-5 h-5" />
                            </NavLink>
                            <NavLink to="/admin/validation" className={sideIconClass} title="Validation">
                                <Shield className="w-5 h-5" />
                            </NavLink>
                        </>
                    ) : null}
                </aside>

                <main className="flex-1 min-w-0 min-h-0 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
