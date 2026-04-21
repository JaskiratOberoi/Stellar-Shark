import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LoadingMark } from './nexus/LoadingMark.jsx';

export function HomeRedirect() {
    const { user, authRequired, loading } = useAuth();

    if (loading || authRequired === null) {
        return <LoadingMark full label="Routing" />;
    }

    if (!authRequired || !user) {
        return <Navigate to="/teller/dashboard" replace />;
    }

    if (user.role === 'super_admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to="/lab/entry" replace />;
}
