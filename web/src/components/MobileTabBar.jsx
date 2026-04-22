import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Activity,
    BarChart3,
    Barcode,
    Boxes,
    ClipboardList,
    Factory,
    History,
    LayoutDashboard,
    Link2,
    LogOut,
    MoreHorizontal,
    Package,
    Shield,
    Users,
    Warehouse,
    X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ThemeToggle } from './nexus/ThemeToggle.jsx';

const barBase =
    'flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-mono uppercase tracking-eyebrow transition-colors';

const sheetItem =
    'flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm text-ink hover:bg-surface-2';

const MORE_SHEET_ADMIN = [
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/bus', label: 'BUs', icon: Factory },
    { to: '/admin/machines', label: 'Machines', icon: Boxes },
    { to: '/admin/kits', label: 'Kits', icon: Package },
    { to: '/admin/parameters', label: 'Params', icon: Link2 },
    { to: '/admin/parameters/mapping', label: 'Parameter mapping', icon: Link2 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/validation', label: 'Validation', icon: Shield },
    { to: '/admin/kit-units', label: 'Kit units', icon: Barcode }
];

/**
 * @param {object} props
 * @param {string} props.to
 * @param {string} props.label
 * @param {import('lucide-react').LucideIcon} props.icon
 * @param {(p: string) => boolean} props.isActive
 */
function MobileTab({ to, label, icon: Icon, isActive: isOn }) {
    const loc = useLocation();
    const on = isOn(loc.pathname);
    return (
        <NavLink
            to={to}
            className={`${barBase} ${on ? 'text-ink' : 'text-ink-3'}`}
            aria-current={on ? 'page' : undefined}
        >
            <span className="relative">
                {on ? <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-ink" /> : null}
                <Icon className="h-5 w-5" strokeWidth={on ? 2.25 : 1.75} aria-hidden />
            </span>
            <span className="line-clamp-2 w-full text-center text-[9px] leading-tight">{label}</span>
        </NavLink>
    );
}

/**
 * @param {object} p
 * @param {boolean} p.open
 * @param {() => void} p.onClose
 * @param {'super' | 'lab'} p.mode
 */
function MoreSheet({ open, onClose, mode }) {
    const loc = useLocation();
    const { user, logout } = useAuth();

    useEffect(() => {
        if (!open) return;
        const h = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-ink/60 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
        >
            <button type="button" className="absolute inset-0 cursor-default" tabIndex={-1} onClick={onClose} />
            <div
                className="relative z-10 flex max-h-[70dvh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-ink bg-surface-elev shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-ink-3/40 mt-2" />
                <div className="flex items-center justify-between border-b border-rule-soft px-4 py-2">
                    <h2 className="font-mono text-eyebrow uppercase text-ink-3">More</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-ink-2 hover:bg-surface-2"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <nav
                    className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
                    onClick={(e) => {
                        const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
                        if (a) onClose();
                    }}
                >
                    {mode === 'super'
                        ? MORE_SHEET_ADMIN.map(({ to, label, icon: Icon }) => (
                              <NavLink
                                  key={to}
                                  to={to}
                                  className={({ isActive }) =>
                                      `${sheetItem} ${isActive || loc.pathname === to ? 'border-ink/20 bg-surface-2' : ''}`
                                  }
                              >
                                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                  {label}
                              </NavLink>
                          ))
                        : null}
                </nav>
                <div
                    className="shrink-0 space-y-2 border-t border-rule-soft p-3"
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-rule-soft bg-surface-2 px-3 py-2">
                        <span className="text-xs text-ink-3">Theme</span>
                        <ThemeToggle />
                    </div>
                    {user ? (
                        <p className="px-1 text-center font-mono text-eyebrow text-ink-2">
                            {user.displayName || user.username}
                        </p>
                    ) : null}
                    {user ? (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                logout();
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink/30 py-2.5 font-mono text-eyebrow uppercase text-ink hover:bg-surface-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function isMorePathActiveForSuper(pathname) {
    if (pathname.startsWith('/admin/analytics')) return true;
    if (pathname.startsWith('/admin/bus')) return true;
    if (pathname.startsWith('/admin/machines')) return true;
    if (pathname.startsWith('/admin/kits')) return true;
    if (pathname.startsWith('/admin/parameters/mapping')) return true;
    if (pathname.startsWith('/admin/parameters')) return true;
    if (pathname.startsWith('/admin/users')) return true;
    if (pathname.startsWith('/admin/validation')) return true;
    if (pathname.startsWith('/admin/kit-units')) return true;
    return false;
}

export function MobileTabBar() {
    const { user } = useAuth();
    const [moreOpen, setMoreOpen] = useState(false);
    const isSuper = user?.role === 'super_admin';
    const isLab = user?.role === 'lab_technician';
    const loc = useLocation();

    if (!user) return null;

    return (
        <>
            <nav
                className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink bg-bg md:hidden"
                style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
                aria-label="Mobile"
            >
                <div className="mx-auto flex max-w-2xl items-stretch">
                    {isSuper ? (
                        <>
                            <MobileTab
                                to="/teller/dashboard"
                                label="Teller"
                                icon={Activity}
                                isActive={(p) => p.startsWith('/teller')}
                            />
                            <MobileTab
                                to="/admin/inventory"
                                label="Inventory"
                                icon={Warehouse}
                                isActive={(p) => p.startsWith('/admin/inventory')}
                            />
                            <MobileTab
                                to="/lab/history"
                                label="History"
                                icon={History}
                                isActive={(p) => p.startsWith('/lab/history')}
                            />
                            <MobileTab
                                to="/admin/dashboard"
                                label="Admin"
                                icon={LayoutDashboard}
                                isActive={(p) => p === '/admin/dashboard'}
                            />
                        </>
                    ) : isLab ? (
                        <>
                            <MobileTab
                                to="/lab/entry"
                                label="Lab"
                                icon={ClipboardList}
                                isActive={(p) => p.startsWith('/lab/entry')}
                            />
                            <MobileTab
                                to="/lab/history"
                                label="History"
                                icon={History}
                                isActive={(p) => p.startsWith('/lab/history')}
                            />
                        </>
                    ) : null}

                    <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
                        <button
                            type="button"
                            onClick={() => setMoreOpen(true)}
                            className={`${barBase} w-full ${
                                isSuper && isMorePathActiveForSuper(loc.pathname) ? 'text-ink' : 'text-ink-3'
                            }`}
                            aria-haspopup="dialog"
                            aria-expanded={moreOpen}
                        >
                            <span className="relative">
                                {isSuper && isMorePathActiveForSuper(loc.pathname) ? (
                                    <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-ink" />
                                ) : null}
                                <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                            </span>
                            <span className="line-clamp-2 w-full text-center text-[9px] leading-tight">More</span>
                        </button>
                    </div>
                </div>
            </nav>

            <MoreSheet
                open={moreOpen}
                onClose={() => setMoreOpen(false)}
                mode={isSuper ? 'super' : 'lab'}
            />
        </>
    );
}
