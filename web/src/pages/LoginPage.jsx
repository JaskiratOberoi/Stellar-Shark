import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function LoginPage() {
    const { login, isAuthenticated, authRequired, loading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const loc = useLocation();
    const from = loc.state?.from?.pathname || '/';

    if (!loading && authRequired === false) {
        return <Navigate to="/teller/dashboard" replace />;
    }

    if (!loading && isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-surface-muted">
            <div className="lab-app-bg genomics-bg" aria-hidden />
            <div className="relative z-10 w-full max-w-md lab-card p-8 shadow-card">
                <h1 className="font-display text-2xl font-bold text-ink">Nexus</h1>
                <p className="text-sm text-ink-muted mt-1">Sign in to continue</p>
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-ink-secondary" htmlFor="user">
                            Username
                        </label>
                        <input
                            id="user"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="lab-input mt-1"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-ink-secondary" htmlFor="pass">
                            Password
                        </label>
                        <input
                            id="pass"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="lab-input mt-1"
                            required
                        />
                    </div>
                    {error ? (
                        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    ) : null}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full py-3"
                    >
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
}
