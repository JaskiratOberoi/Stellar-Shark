import { apiUrl, authHeaders } from './apiClient.js';

/**
 * POST /api/run and consume SSE-style `data: {...}\n\n` chunks from the response body.
 * @param {object} body
 * @param {(evt: object) => void} onEvent
 * @param {AbortSignal} [signal]
 */

export async function streamGenomicsRun(body, onEvent, signal) {
    const res = await fetch(apiUrl('/api/run'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...authHeaders()
        },
        body: JSON.stringify(body),
        signal
    });

    if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'A run is already in progress');
    }

    if (res.status === 401) {
        throw new Error('Authentication required. Please sign in.');
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const dec = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const chunk of parts) {
            const line = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
                const evt = JSON.parse(line.slice(6));
                onEvent(evt);
            } catch {
                /* ignore parse errors */
            }
        }
    }
}

export async function cancelRun() {
    const res = await fetch(apiUrl('/api/cancel'), {
        method: 'POST',
        headers: { ...authHeaders() }
    });
    return res.json();
}
