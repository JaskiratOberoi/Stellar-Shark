'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { runGenomicsDailyCount } = require('../scraper/genomicsStatsScraper');
const { DEFAULT_BUSINESS_UNIT } = require('../scraper/constants');

const PORT = Number(process.env.PORT || 3001);
const app = express();

app.use(
    cors({
        origin: [/localhost:\d+$/, /127\.0\.0\.1:\d+$/],
        credentials: true
    })
);
app.use(express.json({ limit: '32kb' }));

/** Single-flight scraper run (abort previous via /api/cancel). */
let currentAbort = null;

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'genomics-dashboard' });
});

app.post('/api/cancel', (_req, res) => {
    if (currentAbort) {
        currentAbort.abort();
        return res.json({ ok: true, message: 'Cancellation requested' });
    }
    res.json({ ok: false, message: 'No active run' });
});

/**
 * POST /api/run
 * Body: { date?, dateFrom?, dateTo?, businessUnit?, businessUnits?: string[], testCode?: string, headless?: boolean }
 * Response: text/event-stream (SSE) — JSON lines in `data: ...`
 */
app.post('/api/run', async (req, res) => {
    if (currentAbort) {
        res.status(409).json({ error: 'A run is already in progress. Cancel it first or wait.' });
        return;
    }

    const controller = new AbortController();
    currentAbort = controller;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const send = (obj) => {
        try {
            res.write(`data: ${JSON.stringify(obj)}\n\n`);
        } catch (_) {}
    };

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
        } else {
            send({ type: 'error', message: err.message || String(err) });
        }
    } finally {
        currentAbort = null;
        try {
            res.end();
        } catch (_) {}
    }
});

const webDist = path.join(__dirname, '..', 'web', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(webDist, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`[Genomics] API http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(webDist, 'index.html'))) {
        console.log(`[Genomics] Serving UI from web/dist`);
    } else {
        console.log(`[Genomics] Dev UI: run npm run dev:web (Vite proxies /api → :${PORT})`);
    }
});
