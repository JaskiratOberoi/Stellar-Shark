/**
 * Append-only persistent run history (browser localStorage).
 * No delete API — records are never removed by the app.
 */
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
 * @param {{ id: string, savedAt: string, result: object }} record
 * @returns {object[]} updated full history
 */
export function appendRunRecord(record) {
    if (typeof localStorage === 'undefined') return [record];
    const prev = loadRunHistory();
    const next = [...prev, record];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
}

export function exportRunHistoryJson() {
    return JSON.stringify(loadRunHistory(), null, 2);
}
