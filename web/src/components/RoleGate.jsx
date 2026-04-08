import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function RoleGate({ roles, children }) {
    const { user, authRequired, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center text-ink-muted">Loading…</div>
        );
    }

    if (!authRequired) {
        return children;
    }

    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
