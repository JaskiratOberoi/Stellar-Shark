'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.STELLAR_SHARK_USER_DATA
    ? path.join(process.env.STELLAR_SHARK_USER_DATA, 'data')
    : path.join(__dirname, '..', 'data');

const RUN_HISTORY_PATH = path.join(DATA_DIR, 'run-history.json');
const MAX_RECORDS = 2000;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadRuns() {
    try {
        const raw = fs.readFileSync(RUN_HISTORY_PATH, 'utf8');
        const j = JSON.parse(raw);
        return Array.isArray(j.runs) ? j.runs : [];
    } catch {
        return [];
    }
}

function saveRuns(runs) {
    ensureDataDir();
    fs.writeFileSync(RUN_HISTORY_PATH, JSON.stringify({ runs }, null, 2), 'utf8');
}

/**
 * @param {{ id: string, savedAt: string, result: object, source?: string, scheduleId?: string, scheduleLabel?: string, datePreset?: string }} record
 */
function appendReportsRun(record) {
    if (!record || !record.id || !record.savedAt || !record.result) {
        throw new Error('Record must include id, savedAt, and result');
    }
    const runs = loadRuns();
    if (runs.some((r) => r.id === record.id)) {
        return runs.length;
    }
    runs.push({
        id: String(record.id),
        savedAt: String(record.savedAt),
        result: record.result,
        ...(record.source ? { source: record.source } : {}),
        ...(record.scheduleId ? { scheduleId: record.scheduleId } : {}),
        ...(record.scheduleLabel ? { scheduleLabel: record.scheduleLabel } : {}),
        ...(record.datePreset ? { datePreset: record.datePreset } : {})
    });
    const trimmed = runs.length > MAX_RECORDS ? runs.slice(-MAX_RECORDS) : runs;
    saveRuns(trimmed);
    return trimmed.length;
}

function listReportsRunsNewestFirst() {
    return loadRuns()
        .slice()
        .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

module.exports = {
    appendReportsRun,
    listReportsRunsNewestFirst,
    RUN_HISTORY_PATH
};
