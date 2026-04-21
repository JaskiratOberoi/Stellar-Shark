'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

{
    const rootDir = path.join(__dirname, '..');
    let envPath = path.join(rootDir, '.env');
    if (process.env.NEXUS_ENV_PATH) {
        envPath = process.env.NEXUS_ENV_PATH;
    } else if (
        process.env.NEXUS_USER_DATA &&
        fs.existsSync(path.join(process.env.NEXUS_USER_DATA, '.env'))
    ) {
        envPath = path.join(process.env.NEXUS_USER_DATA, '.env');
    }
    require('dotenv').config({ path: envPath });
}

if (process.env.NEXUS_DESKTOP === '1') {
    process.env.NODE_ENV = 'production';
}

const { runGenomicsDailyCount, getDefaultDateIso } = require('../scraper/genomicsStatsScraper');
const { DEFAULT_BUSINESS_UNIT } = require('../scraper/constants');
const { createScheduler } = require('./schedulerService');
const { appendReportsRun, listReportsRunsNewestFirst } = require('./runHistoryFile');
const { migrate } = require('./db/migrate');
const { closePool, useDatabase } = require('./db/pool');
const { requireAuth, requireRole } = require('./auth');
const authApi = require('./routes/authApi');
const adminApi = require('./routes/adminApi');
const labApi = require('./routes/labApi');

const PORT = Number(process.env.PORT || 3101);
const app = express();

function buildCorsOptions() {
    const raw = process.env.CORS_ORIGINS;
    if (raw && String(raw).trim()) {
        const list = String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return {
            origin: list,
            credentials: true
        };
    }
    return {
        origin: [/localhost:\d+$/, /127\.0\.0\.1:\d+$/],
        credentials: true
    };
}

app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '32mb' }));

app.use('/api/auth', authApi);
app.use('/api/admin', adminApi);
app.use('/api/lab', labApi);

/** Single-flight scraper run (abort previous via /api/cancel). */
let currentAbort = null;

function tryAcquireRunSlot() {
    if (currentAbort) return null;
    const controller = new AbortController();
    currentAbort = controller;
    return controller;
}

function releaseRunSlot(controller) {
    if (controller && currentAbort === controller) {
        currentAbort = null;
    }
}

const scheduler = createScheduler({
    tryAcquireRunSlot,
    releaseRunSlot,
    runGenomicsDailyCount,
    getDefaultDateIso
});

app.get('/api/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'nexus',
        database: useDatabase() ? 'postgres' : 'file'
    });
});

// Teller (scraper / scheduler / run history) endpoints are restricted to
// super_admin. Lab technicians use the /api/lab/* surface instead.
const requireTellerAccess = [requireAuth, requireRole('super_admin')];

app.post('/api/cancel', requireTellerAccess, (_req, res) => {
    if (currentAbort) {
        currentAbort.abort();
        return res.json({ ok: true, message: 'Cancellation requested' });
    }
    res.json({ ok: false, message: 'No active run' });
});

app.get('/api/scheduler', requireTellerAccess, async (_req, res) => {
    try {
        res.json(await scheduler.getState());
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

app.put('/api/scheduler', requireTellerAccess, async (req, res) => {
    try {
        const raw = req.body && req.body.schedules;
        if (!Array.isArray(raw)) {
            res.status(400).json({ error: 'Body must include schedules: []' });
            return;
        }
        const schedules = await scheduler.setSchedules(raw);
        res.json({ ok: true, schedules, timezone: process.env.TZ || 'Asia/Kolkata' });
    } catch (err) {
        res.status(400).json({ error: err.message || String(err) });
    }
});

app.get('/api/run-history', requireTellerAccess, async (_req, res) => {
    try {
        const runs = await listReportsRunsNewestFirst();
        res.json({ runs });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

app.post('/api/run-history', requireTellerAccess, async (req, res) => {
    try {
        await appendReportsRun(req.body || {});
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: err.message || String(err) });
    }
});

/**
 * POST /api/run
 * Body: { date?, dateFrom?, dateTo?, businessUnit?, businessUnits?: string[], testCode?: string, headless?: boolean }
 * Response: text/event-stream (SSE) — JSON lines in `data: ...`
 */
app.post('/api/run', requireTellerAccess, async (req, res) => {
    const controller = tryAcquireRunSlot();
    if (!controller) {
        res.status(409).json({ error: 'A run is already in progress. Cancel it first or wait.' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const send = (obj) => {
        try {
            res.write(`data: ${JSON.stringify(obj)}\n\n`);
        } catch (_) {}
    };

    /* Do NOT use req.on('close') — for POST it fires when the request body stream ends (normal), aborting the run immediately. */
    let runCompleted = false;
    const onClientGone = () => {
        if (runCompleted || res.writableEnded || res.writableFinished) return;
        try {
            controller.abort();
        } catch (_) {}
    };
    req.on('aborted', onClientGone);
    req.socket?.once('close', onClientGone);

    const body = req.body || {};
    const headless = body.headless !== false;
    const dateFrom = body.dateFrom || body.date;
    const dateTo = body.dateTo || body.date || body.dateFrom;
    const businessUnits = Array.isArray(body.businessUnits) ? body.businessUnits : null;
    const businessUnit = body.businessUnit || DEFAULT_BUSINESS_UNIT;
    const testCode = body.testCode != null ? String(body.testCode) : '';

    try {
        await runGenomicsDailyCount({
            dateFromIso: dateFrom,
            dateToIso: dateTo,
            ...(businessUnits && businessUnits.length > 0 ? { businessUnits } : { businessUnit }),
            testCode,
            headless,
            signal: controller.signal,
            onProgress: send
        });
    } catch (err) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
            send({ type: 'cancelled', message: 'Run cancelled' });
        } else if (err.name === 'TimeoutError') {
            send({ type: 'error', message: err.message || String(err) });
        } else {
            send({ type: 'error', message: err.message || String(err) });
        }
    } finally {
        runCompleted = true;
        req.removeListener('aborted', onClientGone);
        releaseRunSlot(controller);
        try {
            res.end();
        } catch (_) {}
    }
});

/**
 * Production UI: web/dist. Desktop sets NEXUS_WEB_DIST before loading this module.
 * Mount happens in startServer() so env is always applied (fork timing was unreliable on Windows).
 */
function resolveWebDistDir() {
    const fromEnv = process.env.NEXUS_WEB_DIST;
    if (fromEnv && String(fromEnv).trim()) {
        const p = path.normalize(String(fromEnv).trim());
        if (fs.existsSync(path.join(p, 'index.html'))) return p;
    }
    const rel = path.join(__dirname, '..', 'web', 'dist');
    if (fs.existsSync(path.join(rel, 'index.html'))) return path.normalize(rel);
    return null;
}

let uiRoutesMounted = false;

function mountUiRoutesIfNeeded() {
    if (uiRoutesMounted) return null;
    const webDistDir = resolveWebDistDir();
    if (!webDistDir) return null;
    app.use(express.static(webDistDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(webDistDir, 'index.html'));
    });
    uiRoutesMounted = true;
    return webDistDir;
}

async function startServer() {
    await migrate();
    const webDistDir = mountUiRoutesIfNeeded();
    return new Promise((resolve, reject) => {
        const host = process.env.NEXUS_BIND;
        const onListen = () => {
            scheduler.startCrons().catch((e) => console.error('[Nexus] scheduler.startCrons failed', e));
            const bound = server.address();
            const port = typeof bound === 'object' && bound ? bound.port : PORT;
            const where =
                typeof bound === 'object' && bound && bound.address === '::'
                    ? `localhost:${port}`
                    : `${host || 'localhost'}:${port}`;
            console.log(`[Nexus] API http://${where}`);
            if (webDistDir) {
                console.log(`[Nexus] Serving UI from ${webDistDir}`);
            } else {
                console.log(`[Nexus] Dev UI: run npm run dev:web (Vite proxies /api → :${port})`);
            }
            resolve(server);
        };
        const server =
            host != null && String(host).length > 0
                ? app.listen(PORT, host, onListen)
                : app.listen(PORT, onListen);
        server.on('error', reject);
    });
}

function registerShutdownHooks() {
    const shutdown = async () => {
        try {
            if (currentAbort) {
                try {
                    currentAbort.abort();
                } catch (_) {}
            }
        } catch (_) {}
        try {
            await closePool();
        } catch (_) {}
        process.exit(0);
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}

if (require.main === module) {
    registerShutdownHooks();
    startServer().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { app, startServer, PORT };
