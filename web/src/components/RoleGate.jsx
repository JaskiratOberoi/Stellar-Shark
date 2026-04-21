import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LoadingMark } from './nexus/LoadingMark.jsx';

export function RoleGate({ roles, children }) {
    const { user, authRequired, loading } = useAuth();

    if (loading) {
        return <LoadingMark label="Checking access" />;
    }

    if (!authRequired) {
        return children;
    }

    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
