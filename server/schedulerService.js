'use strict';

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const crypto = require('crypto');
const { computeRangeForPreset } = require('./labDateRange');
const { appendReportsRun } = require('./runHistoryFile');

const DATA_DIR = process.env.STELLAR_SHARK_USER_DATA
    ? path.join(process.env.STELLAR_SHARK_USER_DATA, 'data')
    : path.join(__dirname, '..', 'data');
const SCHEDULES_PATH = path.join(DATA_DIR, 'scheduler.json');
const RUNS_PATH = path.join(DATA_DIR, 'scheduler-runs.json');

const MAX_RUNS = 500;

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

function loadSchedulesFromDisk() {
    const j = loadJson(SCHEDULES_PATH, { schedules: [] });
    return Array.isArray(j.schedules) ? j.schedules : [];
}

function saveSchedulesToDisk(schedules) {
    ensureDataDir();
    fs.writeFileSync(SCHEDULES_PATH, JSON.stringify({ schedules }, null, 2), 'utf8');
}

function loadRunsFromDisk() {
    const j = loadJson(RUNS_PATH, { runs: [] });
    return Array.isArray(j.runs) ? j.runs : [];
}

function saveRunsToDisk(runs) {
    ensureDataDir();
    fs.writeFileSync(RUNS_PATH, JSON.stringify({ runs }, null, 2), 'utf8');
}

function appendRunRecord(entry) {
    const runs = loadRunsFromDisk();
    runs.push(entry);
    const trimmed = runs.length > MAX_RUNS ? runs.slice(-MAX_RUNS) : runs;
    saveRunsToDisk(trimmed);
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
            appendRunRecord({
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
            appendRunRecord({
                id: runId,
                runAt,
                scheduleId: schedule.id,
                scheduleLabel: schedule.label || schedule.timeLocal,
                status: 'ok',
                result
            });
            try {
                appendReportsRun({
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
                appendRunRecord({
                    id: runId,
                    runAt: new Date().toISOString(),
                    scheduleId: schedule.id,
                    scheduleLabel: schedule.label || schedule.timeLocal,
                    status: 'cancelled',
                    message: 'Run was cancelled.'
                });
            } else {
                appendRunRecord({
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

    function startCrons() {
        stopCrons();
        const tz = process.env.TZ || 'Asia/Kolkata';
        const schedules = loadSchedulesFromDisk();

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
                    jobQueue.push({ schedule: scheduleSnapshot });
                    drainQueue().catch(() => {});
                },
                { timezone: tz }
            );
            cronTasks.push(task);
        }
    }

    function getState() {
        return {
            timezone: process.env.TZ || 'Asia/Kolkata',
            schedules: loadSchedulesFromDisk(),
            runs: loadRunsFromDisk().slice().reverse()
        };
    }

    function setSchedules(rawList) {
        if (!Array.isArray(rawList)) {
            throw new Error('Expected { schedules: [...] }');
        }
        const next = [];
        for (const raw of rawList) {
            next.push(normalizeSchedule(raw));
        }
        saveSchedulesToDisk(next);
        startCrons();
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
