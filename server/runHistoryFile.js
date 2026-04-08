'use strict';

const fs = require('fs');
const path = require('path');
const { getPool, useDatabase } = require('./db/pool');
const { maybeSyncValidationFromReportResult } = require('./validationService');

const DATA_DIR = process.env.NEXUS_USER_DATA
    ? path.join(process.env.NEXUS_USER_DATA, 'data')
    : path.join(__dirname, '..', 'data');

const RUN_HISTORY_PATH = path.join(DATA_DIR, 'run-history.json');
const MAX_RECORDS = 2000;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadRunsFile() {
    try {
        const raw = fs.readFileSync(RUN_HISTORY_PATH, 'utf8');
        const j = JSON.parse(raw);
        return Array.isArray(j.runs) ? j.runs : [];
    } catch {
        return [];
    }
}

function saveRunsFile(runs) {
    ensureDataDir();
    fs.writeFileSync(RUN_HISTORY_PATH, JSON.stringify({ runs }, null, 2), 'utf8');
}

async function trimReportsRunsDb() {
    const pool = getPool();
    await pool.query(`
        DELETE FROM reports_runs
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY saved_at DESC) AS rn
                FROM reports_runs
            ) t WHERE rn > $1
        )
    `, [MAX_RECORDS]);
}

/**
 * @param {{ id: string, savedAt: string, result: object, source?: string, scheduleId?: string, scheduleLabel?: string, datePreset?: string }} record
 */
async function appendReportsRun(record) {
    if (!record || !record.id || !record.savedAt || !record.result) {
        throw new Error('Record must include id, savedAt, and result');
    }

    if (useDatabase()) {
        const pool = getPool();
        const r = await pool.query(
            `INSERT INTO reports_runs (id, saved_at, result, source, schedule_id, schedule_label, date_preset)
             VALUES ($1, $2::timestamptz, $3::jsonb, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [
                String(record.id),
                String(record.savedAt),
                JSON.stringify(record.result),
                record.source || null,
                record.scheduleId || null,
                record.scheduleLabel || null,
                record.datePreset || null
            ]
        );
        if (r.rowCount === 0) {
            const c = await pool.query('SELECT COUNT(*)::int AS n FROM reports_runs');
            return c.rows[0].n;
        }
        await trimReportsRunsDb();
        const c = await pool.query('SELECT COUNT(*)::int AS n FROM reports_runs');
        try {
            const parsed =
                typeof record.result === 'string' ? JSON.parse(record.result) : record.result;
            await maybeSyncValidationFromReportResult(parsed);
        } catch (e) {
            console.error('[Nexus] validation sync after reports_runs insert failed', e.message || e);
        }
        return c.rows[0].n;
    }

    const runs = loadRunsFile();
    if (runs.some((x) => x.id === record.id)) {
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
    saveRunsFile(trimmed);
    return trimmed.length;
}

async function listReportsRunsNewestFirst() {
    if (useDatabase()) {
        const pool = getPool();
        const { rows } = await pool.query(`
            SELECT id, saved_at, result, source, schedule_id, schedule_label, date_preset
            FROM reports_runs
            ORDER BY saved_at DESC
        `);
        return rows.map((row) => ({
            id: row.id,
            savedAt: new Date(row.saved_at).toISOString(),
            result: row.result,
            ...(row.source ? { source: row.source } : {}),
            ...(row.schedule_id ? { scheduleId: row.schedule_id } : {}),
            ...(row.schedule_label ? { scheduleLabel: row.schedule_label } : {}),
            ...(row.date_preset ? { datePreset: row.date_preset } : {})
        }));
    }

    return loadRunsFile()
        .slice()
        .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

module.exports = {
    appendReportsRun,
    listReportsRunsNewestFirst,
    RUN_HISTORY_PATH
};
