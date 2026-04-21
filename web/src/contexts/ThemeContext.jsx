import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'nexus_theme';
const ThemeContext = createContext(null);

function readStored() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch (_) {}
    return 'system';
}

function resolve(mode) {
    if (mode === 'system') {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
}

function apply(resolved) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }) {
    const [mode, setMode] = useState(() => readStored());
    const [resolved, setResolved] = useState(() => resolve(readStored()));

    useEffect(() => {
        const r = resolve(mode);
        setResolved(r);
        apply(r);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (_) {}
    }, [mode]);

    useEffect(() => {
        if (mode !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            const r = e.matches ? 'dark' : 'light';
            setResolved(r);
            apply(r);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [mode]);

    const cycle = useCallback(() => {
        setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'));
    }, []);

    const value = useMemo(() => ({ mode, resolved, setMode, cycle }), [mode, resolved, cycle]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
