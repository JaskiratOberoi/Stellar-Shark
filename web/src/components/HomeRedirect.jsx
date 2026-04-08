import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function HomeRedirect() {
    const { user, authRequired, loading } = useAuth();

    if (loading || authRequired === null) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-surface-muted text-ink-muted">
                Loading…
            </div>
        );
    }

    if (!authRequired || !user) {
        return <Navigate to="/teller/dashboard" replace />;
    }

    if (user.role === 'super_admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to="/lab/entry" replace />;
}
