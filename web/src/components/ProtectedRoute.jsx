import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function ProtectedRoute() {
    const { loading, authRequired, isAuthenticated } = useAuth();
    const loc = useLocation();

    if (loading || authRequired === null) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-surface-muted text-ink-muted">
                Loading…
            </div>
        );
    }

    if (authRequired && !isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: loc }} />;
    }

    return <Outlet />;
}

export function RoleRoute({ roles }) {
    const { user, authRequired, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-surface-muted text-ink-muted">
                Loading…
            </div>
        );
    }

    if (!authRequired) {
        return <Outlet />;
    }

    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
