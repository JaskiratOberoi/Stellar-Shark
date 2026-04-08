'use strict';

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const crypto = require('crypto');
const { computeRangeForPreset } = require('./labDateRange');
const { appendReportsRun } = require('./runHistoryFile');
const { getPool, useDatabase } = require('./db/pool');

const DATA_DIR = process.env.NEXUS_USER_DATA
    ? path.join(process.env.NEXUS_USER_DATA, 'data')
    : path.join(__dirname, '..', 'data');
const SCHEDULES_PATH = path.join(DATA_DIR, 'scheduler.json');
const RUNS_PATH = path.join(DATA_DIR, 'scheduler-runs.json');

const MAX_RUNS = 500;
const MAX_SCHEDULER_QUEUE = Math.max(1, Number(process.env.NEXUS_SCHEDULER_QUEUE_MAX || 10));

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(file, fallback) {
    try {
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function loadSchedulesFile() {
    const j = loadJson(SCHEDULES_PATH, { schedules: [] });
    return Array.isArray(j.schedules) ? j.schedules : [];
}

function saveSchedulesFile(schedules) {
    ensureDataDir();
    fs.writeFileSync(SCHEDULES_PATH, JSON.stringify({ schedules }, null, 2), 'utf8');
}

function loadRunsFile() {
    const j = loadJson(RUNS_PATH, { runs: [] });
    return Array.isArray(j.runs) ? j.runs : [];
}

function saveRunsFile(runs) {
    ensureDataDir();
    fs.writeFileSync(RUNS_PATH, JSON.stringify({ runs }, null, 2), 'utf8');
}

async function loadSchedules() {
    if (useDatabase()) {
        const pool = getPool();
        const { rows } = await pool.query(`
            SELECT id, enabled, time_local, label, business_units, test_code, headless, date_preset
            FROM scheduler_schedules
            ORDER BY id
        `);
        return rows.map((r) => ({
            id: r.id,
            enabled: r.enabled,
            timeLocal: r.time_local,
            label: r.label,
            businessUnits: Array.isArray(r.business_units) ? r.business_units : r.business_units,
            testCode: r.test_code,
            headless: r.headless,
            datePreset: r.date_preset
        }));
    }
    return loadSchedulesFile();
}

async function saveSchedules(schedules) {
    if (useDatabase()) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM scheduler_schedules');
            for (const s of schedules) {
                await client.query(
                    `INSERT INTO scheduler_schedules (id, enabled, time_local, label, business_units, test_code, headless, date_preset)
                     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
                    [
                        s.id,
                        s.enabled,
                        s.timeLocal,
                        s.label,
                        JSON.stringify(s.businessUnits || []),
                        s.testCode,
                        s.headless,
                        s.datePreset
                    ]
                );
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return;
    }
    saveSchedulesFile(schedules);
}

async function appendRunRecord(entry) {
    if (useDatabase()) {
        const pool = getPool();
        await pool.query(
            `INSERT INTO scheduler_runs (id, run_at, schedule_id, schedule_label, status, message, result)
             VALUES ($1, $2::timestamptz, $3, $4, $5, $6, $7::jsonb)`,
            [
                entry.id,
                entry.runAt,
                entry.scheduleId,
                entry.scheduleLabel,
                entry.status,
                entry.message != null ? entry.message : null,
                entry.result != null ? JSON.stringify(entry.result) : null
            ]
        );
        await pool.query(`
            DELETE FROM scheduler_runs
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY run_at DESC) AS rn
                    FROM scheduler_runs
                ) t WHERE rn > $1
            )
        `, [MAX_RUNS]);
        return;
    }
    const runs = loadRunsFile();
    runs.push(entry);
    const trimmed = runs.length > MAX_RUNS ? runs.slice(-MAX_RUNS) : runs;
    saveRunsFile(trimmed);
}

async function loadRunsForState() {
    if (useDatabase()) {
        const pool = getPool();
        const { rows } = await pool.query(`
            SELECT id, run_at, schedule_id, schedule_label, status, message, result
            FROM scheduler_runs
            ORDER BY run_at ASC
        `);
        return rows.map((r) => ({
            id: r.id,
            runAt: new Date(r.run_at).toISOString(),
            scheduleId: r.schedule_id,
            scheduleLabel: r.schedule_label,
            status: r.status,
            ...(r.message != null ? { message: r.message } : {}),
            ...(r.result != null ? { result: r.result } : {})
        }));
    }
    return loadRunsFile();
}

function parseTimeLocal(timeLocal) {
    const m = String(timeLocal || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
}

function normalizeSchedule(raw) {
    const id =
        typeof raw.id === 'string' && raw.id.trim()
            ? raw.id.trim()
            : typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `sch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timeParsed = parseTimeLocal(raw.timeLocal);
    if (!timeParsed) {
        throw new Error(`Invalid timeLocal (use HH:MM 24h): ${raw.timeLocal}`);
    }
    const businessUnits = Array.isArray(raw.businessUnits)
        ? [...new Set(raw.businessUnits.map((x) => String(x || '').trim()).filter(Boolean))]
        : [];
    if (businessUnits.length === 0) {
        throw new Error('Each schedule needs at least one business unit.');
    }
    const testCode = raw.testCode != null ? String(raw.testCode).trim() : '';
    const headless = raw.headless !== false;
    const enabled = Boolean(raw.enabled);
    const label = raw.label != null ? String(raw.label).trim() : '';
    const hh = String(timeParsed.hour).padStart(2, '0');
    const mm = String(timeParsed.minute).padStart(2, '0');
    const allowedPresets = new Set(['today', 'yesterday', 'last7', 'mtd', 'ytd']);
    const rawPreset = String(raw.datePreset || 'today').trim();
    const datePreset = allowedPresets.has(rawPreset) ? rawPreset : 'today';
    return {
        id,
        enabled,
        timeLocal: `${hh}:${mm}`,
        label,
        businessUnits,
        testCode,
        headless,
        datePreset
    };
}

/**
 * @param {object} deps
 * @param {() => import('events').AbortController | null} deps.tryAcquireRunSlot
 * @param {(c: import('events').AbortController) => void} deps.releaseRunSlot
 * @param {typeof import('../scraper/genomicsStatsScraper.js').runGenomicsDailyCount} deps.runGenomicsDailyCount
 * @param {() => string} deps.getDefaultDateIso
 */
function createScheduler(deps) {
    const { tryAcquireRunSlot, releaseRunSlot, runGenomicsDailyCount, getDefaultDateIso } = deps;

    /** @type {import('node-cron').ScheduledTask[]} */
    let cronTasks = [];
    const jobQueue = [];
    let workerActive = false;

    async function drainQueue() {
        if (workerActive) return;
        workerActive = true;
        try {
            while (jobQueue.length > 0) {
                const job = jobQueue.shift();
                await runScheduledJob(job);
            }
        } finally {
            workerActive = false;
        }
    }

    async function runScheduledJob({ schedule }) {
        const slot = tryAcquireRunSlot();
        if (!slot) {
            await appendRunRecord({
                id:
                    typeof crypto.randomUUID === 'function'
                        ? crypto.randomUUID()
                        : `run-${Date.now()}`,
                runAt: new Date().toISOString(),
                scheduleId: schedule.id,
                scheduleLabel: schedule.label || schedule.timeLocal,
                status: 'skipped',
                message: 'Another run was already in progress (manual or scheduled).'
            });
            return;
        }

        const { dateFromIso, dateToIso } = computeRangeForPreset(schedule.datePreset || 'today');
        const runId =
            typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `run-${Date.now()}`;
        const runAt = new Date().toISOString();
        try {
            const result = await runGenomicsDailyCount({
                dateFromIso,
                dateToIso,
                businessUnits: schedule.businessUnits,
                testCode: schedule.testCode,
                headless: schedule.headless,
                signal: slot.signal,
                onProgress: () => {}
            });
            await appendRunRecord({
                id: runId,
                runAt,
                scheduleId: schedule.id,
                scheduleLabel: schedule.label || schedule.timeLocal,
                status: 'ok',
                result
            });
            try {
                await appendReportsRun({
                    id: runId,
                    savedAt: runAt,
                    result,
                    source: 'scheduler',
                    scheduleId: schedule.id,
                    scheduleLabel: schedule.label || schedule.timeLocal,
                    datePreset: schedule.datePreset || 'today'
                });
            } catch (e) {
                console.error('[Scheduler] appendReportsRun failed', e.message || e);
            }
        } catch (err) {
            const name = err && err.name;
            if (name === 'AbortError') {
                await appendRunRecord({
                    id: runId,
                    runAt: new Date().toISOString(),
                    scheduleId: schedule.id,
                    scheduleLabel: schedule.label || schedule.timeLocal,
                    status: 'cancelled',
                    message: 'Run was cancelled.'
                });
            } else {
                await appendRunRecord({
                    id: runId,
                    runAt: new Date().toISOString(),
                    scheduleId: schedule.id,
                    scheduleLabel: schedule.label || schedule.timeLocal,
                    status: 'error',
                    message: err.message || String(err)
                });
            }
        } finally {
            releaseRunSlot(slot);
        }
    }

    function stopCrons() {
        for (const t of cronTasks) {
            try {
                t.stop();
            } catch (_) {}
        }
        cronTasks = [];
    }

    async function startCrons() {
        stopCrons();
        const tz = process.env.TZ || 'Asia/Kolkata';
        const schedules = await loadSchedules();

        for (const s of schedules) {
            if (!s.enabled) continue;
            const parsed = parseTimeLocal(s.timeLocal);
            if (!parsed) continue;
            const expr = `${parsed.minute} ${parsed.hour} * * *`;
            if (!cron.validate(expr)) continue;

            const scheduleSnapshot = { ...s };
            const task = cron.schedule(
                expr,
                () => {
                    if (jobQueue.length >= MAX_SCHEDULER_QUEUE) {
                        console.warn(
                            `[Scheduler] Queue cap (${MAX_SCHEDULER_QUEUE}) reached; skipping tick for "${scheduleSnapshot.label || scheduleSnapshot.timeLocal}". Raise NEXUS_SCHEDULER_QUEUE_MAX if needed.`
                        );
                        appendRunRecord({
                            id:
                                typeof crypto.randomUUID === 'function'
                                    ? crypto.randomUUID()
                                    : `run-${Date.now()}`,
                            runAt: new Date().toISOString(),
                            scheduleId: scheduleSnapshot.id,
                            scheduleLabel: scheduleSnapshot.label || scheduleSnapshot.timeLocal,
                            status: 'skipped',
                            message: `Scheduler queue full (max ${MAX_SCHEDULER_QUEUE}).`
                        }).catch(() => {});
                        return;
                    }
                    jobQueue.push({ schedule: scheduleSnapshot });
                    drainQueue().catch(() => {});
                },
                { timezone: tz }
            );
            cronTasks.push(task);
        }
    }

    async function getState() {
        const runs = await loadRunsForState();
        return {
            timezone: process.env.TZ || 'Asia/Kolkata',
            schedules: await loadSchedules(),
            runs: runs.slice().reverse()
        };
    }

    async function setSchedules(rawList) {
        if (!Array.isArray(rawList)) {
            throw new Error('Expected { schedules: [...] }');
        }
        const next = [];
        for (const raw of rawList) {
            next.push(normalizeSchedule(raw));
        }
        await saveSchedules(next);
        await startCrons();
        return next;
    }

    return {
        getState,
        setSchedules,
        startCrons
    };
}

module.exports = {
    createScheduler,
    parseTimeLocal,
    normalizeSchedule
};
