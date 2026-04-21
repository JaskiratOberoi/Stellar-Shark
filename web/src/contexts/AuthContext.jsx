import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, apiUrl, getToken, setToken } from '../apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const [authRequired, setAuthRequired] = useState(null);
    const [user, setUser] = useState(null);
    const [guest, setGuest] = useState(false);

    const refreshMe = useCallback(async () => {
        try {
            const res = await apiFetch('/api/auth/me');
            if (!res.ok) {
                setUser(null);
                setGuest(false);
                return;
            }
            const data = await res.json();
            if (data.guest) {
                setUser(null);
                setGuest(true);
                return;
            }
            setGuest(false);
            setUser(data.user || null);
        } catch {
            setUser(null);
            setGuest(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const h = await fetch(apiUrl('/api/health'));
                const d = await h.json();
                const needAuth = d.database === 'postgres';
                if (cancelled) return;
                setAuthRequired(needAuth);
                if (needAuth && getToken()) {
                    await refreshMe();
                } else if (!needAuth) {
                    setGuest(true);
                    setUser(null);
                }
            } catch {
                if (!cancelled) {
                    setAuthRequired(false);
                    setGuest(true);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshMe]);

    const login = useCallback(async (username, password) => {
        const res = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `Login failed (${res.status})`);
        }
        setToken(data.token);
        setUser(data.user);
        setGuest(false);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch {
            /* ignore */
        }
        setToken(null);
        setUser(null);
        if (authRequired === false) setGuest(true);
    }, [authRequired]);

    const value = useMemo(
        () => ({
            loading,
            authRequired,
            user,
            guest,
            login,
            logout,
            refreshMe,
            isAuthenticated: authRequired === false || Boolean(user)
        }),
        [loading, authRequired, user, guest, login, logout, refreshMe]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
