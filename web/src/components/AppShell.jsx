import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Activity,
    BarChart3,
    Boxes,
    ClipboardList,
    Factory,
    History,
    LayoutDashboard,
    Link2,
    LogOut,
    Package,
    Shield,
    Users,
    Warehouse
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { NexusWordmark } from './nexus/NexusWordmark.jsx';
import { ThemeToggle } from './nexus/ThemeToggle.jsx';
import { MobileTabBar } from './MobileTabBar.jsx';

function NavItem({ to, label, end = false }) {
    const reduce = useReducedMotion();
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `relative inline-flex items-center px-3 py-2 font-mono uppercase text-eyebrow transition-colors duration-150 ease-snap ${
                    isActive ? 'text-ink' : 'text-ink-3 hover:text-ink'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <span>{label}</span>
                    {isActive ? (
                        reduce ? (
                            <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-ink" />
                        ) : (
                            <motion.span
                                layoutId="nav-underline"
                                className="absolute left-2 right-2 -bottom-px h-[2px] bg-ink"
                                transition={{ duration: 0.25, ease: [0.65, 0, 0.35, 1] }}
                            />
                        )
                    ) : null}
                </>
            )}
        </NavLink>
    );
}

const sideIconBase =
    'group relative flex flex-col items-center gap-1 py-3 w-full font-mono text-[9px] uppercase tracking-eyebrow transition-colors duration-150 ease-snap';

function SideIcon({ to, icon: Icon, label, end = false }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `${sideIconBase} ${isActive ? 'text-ink' : 'text-ink-3 hover:text-ink hover:bg-surface-2'}`
            }
            title={label}
        >
            {({ isActive }) => (
                <>
                    {isActive ? (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-ink" aria-hidden />
                    ) : null}
                    <Icon className="w-4 h-4" aria-hidden strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="leading-none">{label}</span>
                </>
            )}
        </NavLink>
    );
}

export function AppShell() {
    const { user, logout } = useAuth();
    const showAdmin = user?.role === 'super_admin';
    const showLab = user?.role === 'lab_technician';
    const loc = useLocation();

    return (
        <div className="min-h-dvh flex flex-col bg-bg text-ink">
            <header className="shrink-0 z-20 border-b border-ink bg-bg">
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-8 max-w-[1600px] mx-auto">
                    <div className="flex min-w-0 items-center gap-8">
                        <NavLink to="/" aria-label="Nexus home">
                            <NexusWordmark variant="inline" size="md" showTagline />
                        </NavLink>
                        <nav className="hidden md:flex items-center gap-1" aria-label="Modules">
                            {!showLab ? <NavItem to="/teller/dashboard" label="Teller" /> : null}
                            {showLab ? (
                                <>
                                    <NavItem to="/lab/entry" label="Lab" />
                                    <NavItem to="/lab/history" label="History" />
                                </>
                            ) : null}
                            {showAdmin ? (
                                <>
                                    <NavItem to="/admin/analytics" label="Analytics" />
                                    <NavItem to="/admin/inventory" label="Inventory" />
                                    <NavItem to="/lab/history" label="History" />
                                    <NavItem to="/admin/dashboard" label="Admin" />
                                </>
                            ) : null}
                        </nav>
                    </div>
                    <div
                        className={`items-center gap-4 ${user ? 'hidden md:flex' : 'flex'}`}
                    >
                        <ThemeToggle />
                        {user ? (
                            <div className="flex items-center gap-3">
                                <span className="hidden sm:inline-flex items-center gap-2 font-mono text-eyebrow uppercase">
                                    <span className="text-ink">{user.displayName || user.username}</span>
                                    <span className="text-ink-3">/</span>
                                    <span className="text-ink-3">{user.role.replace('_', ' ')}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="nexus-btn-ghost py-2 px-3"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Sign out</span>
                                </button>
                            </div>
                        ) : (
                            <span className="font-mono text-eyebrow uppercase text-ink-3">Guest mode</span>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 min-h-0 min-w-0" key={loc.pathname.split('/')[1]}>
                <aside
                    className="hidden lg:flex w-[88px] shrink-0 flex-col border-r border-ink bg-bg"
                    aria-label="Quick navigation"
                >
                    <div className="px-2 py-3 border-b border-rule-soft">
                        <p
                            className="font-mono uppercase text-eyebrow text-ink-3 text-center"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                            Modules
                        </p>
                    </div>
                    {!showLab ? <SideIcon to="/teller/dashboard" icon={Activity} label="Teller" /> : null}
                    {showLab ? <SideIcon to="/lab/entry" icon={ClipboardList} label="Lab" /> : null}
                    {showAdmin ? (
                        <>
                            <SideIcon to="/admin/analytics" icon={BarChart3} label="Stats" />
                            <SideIcon to="/admin/inventory" icon={Warehouse} label="Inv" />
                            <SideIcon to="/lab/history" icon={History} label="History" />
                            <SideIcon to="/admin/dashboard" icon={LayoutDashboard} label="Admin" />
                            <SideIcon to="/admin/bus" icon={Factory} label="BUs" />
                            <SideIcon to="/admin/machines" icon={Boxes} label="Mach" />
                            <SideIcon to="/admin/kits" icon={Package} label="Kits" />
                            <SideIcon to="/admin/parameters" icon={Link2} label="Params" />
                            <SideIcon to="/admin/users" icon={Users} label="Users" />
                            <SideIcon to="/admin/validation" icon={Shield} label="Valid" />
                        </>
                    ) : null}
                </aside>

                <main className="flex-1 min-h-0 min-w-0 overflow-auto pb-[max(4.5rem,env(safe-area-inset-bottom))] md:pb-0">
                    <Outlet />
                </main>
            </div>
            <MobileTabBar />
        </div>
    );
}
