/**
 * Run history: primary store is the API (`/api/run-history`) under server userData.
 * localStorage mirrors a cache for offline / dev without API.
 */
import { apiFetch } from './apiClient.js';

const STORAGE_KEY = 'labintel_run_history_v1';

function safeParse(raw) {
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

export function loadRunHistory() {
    if (typeof localStorage === 'undefined') return [];
    return safeParse(localStorage.getItem(STORAGE_KEY));
}

/**
 * Load from server when possible; migrate legacy local-only rows once; mirror to localStorage.
 */
export async function fetchRunHistory() {
    try {
        const res = await apiFetch('/api/run-history');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let runs = Array.isArray(data.runs) ? data.runs : [];
        if (runs.length === 0) {
            const local = loadRunHistory();
            if (local.length > 0) {
                for (const rec of local) {
                    try {
                        await apiFetch('/api/run-history', {
                            method: 'POST',
                            body: JSON.stringify(rec)
                        });
                    } catch {
                        /* ignore */
                    }
                }
                const res2 = await apiFetch('/api/run-history');
                if (res2.ok) {
                    const d2 = await res2.json();
                    runs = Array.isArray(d2.runs) ? d2.runs : runs;
                }
            }
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
        } catch {
            /* ignore */
        }
        return runs;
    } catch {
        return loadRunHistory();
    }
}

/**
 * @param {{ id: string, savedAt: string, result: object, source?: string }} record
 */
export async function appendRunRecord(record) {
    try {
        const res = await apiFetch('/api/run-history', {
            method: 'POST',
            body: JSON.stringify(record)
        });
        if (res.ok) {
            const prev = loadRunHistory();
            const next = [...prev.filter((r) => r.id !== record.id), record];
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
            return next;
        }
    } catch {
        /* offline fallback */
    }
    if (typeof localStorage === 'undefined') return [record];
    const prev = loadRunHistory();
    const next = [...prev.filter((r) => r.id !== record.id), record];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
}

export async function exportRunHistoryJson() {
    const runs = await fetchRunHistory();
    return JSON.stringify(runs, null, 2);
}
