'use strict';

const crypto = require('crypto');
const express = require('express');
const { getPool, useDatabase } = require('../db/pool');
const { requireAuth, requireRole, loadUserBus } = require('../auth');
const { maybeRecomputeLabAfterEntry } = require('../validationService');

const router = express.Router();

router.use(requireAuth);

const requireLabTech = requireRole('lab_technician');
const requireLabRead = requireRole('lab_technician', 'super_admin');

function newId(prefix) {
    return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

router.get('/machines', requireLabTech, async (req, res) => {
    try {
        if (!useDatabase()) {
            return res.status(503).json({ error: 'Database not configured' });
        }
        const pool = getPool();
        const bus = await loadUserBus(pool, req.user.id);
        const buIds = bus.map((b) => b.id);
        if (!buIds.length) {
            return res.json({ machines: [] });
        }
        const r = await pool.query(
            `SELECT m.*, bu.name AS bu_name
             FROM machines m
             JOIN business_units bu ON bu.id = m.bu_id
             WHERE m.bu_id = ANY($1::text[]) AND m.active = true
             ORDER BY bu.name, m.name`,
            [buIds]
        );
        res.json({ machines: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/machines/:machineId/parameters', requireLabTech, async (req, res) => {
    try {
        const { machineId } = req.params;
        const pool = getPool();
        const bus = await loadUserBus(pool, req.user.id);
        const buIds = new Set(bus.map((b) => b.id));
        const m = await pool.query(`SELECT id, bu_id FROM machines WHERE id = $1`, [machineId]);
        if (!m.rows.length) return res.status(404).json({ error: 'Machine not found' });
        if (!buIds.has(m.rows[0].bu_id)) {
            return res.status(403).json({ error: 'Not allowed for this machine' });
        }
        const r = await pool.query(
            `SELECT p.id, p.name, p.code
             FROM parameters p
             JOIN parameter_machine_mapping pm ON pm.parameter_id = p.id
             WHERE pm.machine_id = $1
             ORDER BY p.name`,
            [machineId]
        );
        res.json({ parameters: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

function normaliseTestCode(raw) {
    if (raw == null) return null;
    const trimmed = String(raw).trim().toUpperCase();
    return trimmed === '' ? null : trimmed.slice(0, 16);
}

function parseOptionalKitCount(raw) {
    if (raw == null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
}

router.post('/entries', requireLabTech, async (req, res) => {
    try {
        const date = req.body?.date != null ? String(req.body.date) : '';
        const machineId = req.body?.machine_id;
        const buId = req.body?.bu_id;
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
        const kitsUsedTotal =
            req.body?.kits_used_total != null ? Number(req.body.kits_used_total) : null;
        const qcKits = parseOptionalKitCount(req.body?.qc_kits);
        const repeatRuns = parseOptionalKitCount(req.body?.repeat_runs);
        const testCode = normaliseTestCode(req.body?.test_code);
        if (!date || !machineId || !buId) {
            return res.status(400).json({ error: 'date, machine_id, bu_id required' });
        }
        if (!testCode) {
            return res.status(400).json({ error: 'test_code required' });
        }
        const pool = getPool();
        const bus = await loadUserBus(pool, req.user.id);
        const buIds = new Set(bus.map((b) => b.id));
        if (!buIds.has(buId)) {
            return res.status(403).json({ error: 'Not allowed for this BU' });
        }
        const m = await pool.query(`SELECT id, bu_id FROM machines WHERE id = $1`, [machineId]);
        if (!m.rows.length || m.rows[0].bu_id !== buId) {
            return res.status(400).json({ error: 'Machine does not belong to BU' });
        }
        const userId = req.user.id;
        const client = await pool.connect();
        let extra = 0;
        try {
            await client.query('BEGIN');
            for (const row of rows) {
                const parameterId = row.parameter_id || null;
                const value = row.value != null ? Number(row.value) : null;
                const kitsUsed = row.kits_used != null ? Number(row.kits_used) : 0;
                const id = newId('lab');
                await client.query(
                    `INSERT INTO lab_entries (id, date, bu_id, machine_id, parameter_id, value, kits_used, entered_by, entry_kind, test_code)
                     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, 'parameter', $9)`,
                    [id, date, buId, machineId, parameterId, value, kitsUsed, userId, testCode]
                );
            }
            if (kitsUsedTotal != null && Number.isFinite(kitsUsedTotal) && kitsUsedTotal >= 0) {
                const id = newId('lab');
                await client.query(
                    `INSERT INTO lab_entries (id, date, bu_id, machine_id, parameter_id, value, kits_used, entered_by, entry_kind, test_code)
                     VALUES ($1, $2::date, $3, $4, NULL, NULL, $5, $6, 'kits', $7)`,
                    [id, date, buId, machineId, kitsUsedTotal, userId, testCode]
                );
                extra += 1;
            }
            if (qcKits != null) {
                const id = newId('lab');
                await client.query(
                    `INSERT INTO lab_entries (id, date, bu_id, machine_id, parameter_id, value, kits_used, entered_by, entry_kind, test_code)
                     VALUES ($1, $2::date, $3, $4, NULL, NULL, $5, $6, 'qc', $7)`,
                    [id, date, buId, machineId, qcKits, userId, testCode]
                );
                extra += 1;
            }
            if (repeatRuns != null) {
                const id = newId('lab');
                await client.query(
                    `INSERT INTO lab_entries (id, date, bu_id, machine_id, parameter_id, value, kits_used, entered_by, entry_kind, test_code)
                     VALUES ($1, $2::date, $3, $4, NULL, NULL, $5, $6, 'repeat', $7)`,
                    [id, date, buId, machineId, repeatRuns, userId, testCode]
                );
                extra += 1;
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        await maybeRecomputeLabAfterEntry(date);
        res.json({ ok: true, count: rows.length + extra });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/entries', requireLabRead, async (req, res) => {
    try {
        const from = req.query.from;
        const to = req.query.to || from;
        if (!from) return res.status(400).json({ error: 'from query required (YYYY-MM-DD)' });
        const pool = getPool();
        const isSuperAdmin = req.user?.role === 'super_admin';
        // Super admin sees every BU's entries (audit trail). Lab techs are scoped to their assigned BUs.
        const projection = `
            SELECT e.*,
                   p.name AS parameter_name,
                   m.name AS machine_name,
                   bu.name AS bu_name,
                   u.username AS entered_by_username,
                   u.display_name AS entered_by_display_name,
                   u.role AS entered_by_role
              FROM lab_entries e
              LEFT JOIN parameters p ON p.id = e.parameter_id
              JOIN machines m ON m.id = e.machine_id
              JOIN business_units bu ON bu.id = e.bu_id
              LEFT JOIN users u ON u.id = e.entered_by
        `;
        let r;
        if (isSuperAdmin) {
            r = await pool.query(
                `${projection}
                 WHERE e.date >= $1::date AND e.date <= $2::date
                 ORDER BY e.date DESC, e.created_at DESC`,
                [from, to || from]
            );
        } else {
            const bus = await loadUserBus(pool, req.user.id);
            const buIds = bus.map((b) => b.id);
            if (!buIds.length) return res.json({ entries: [] });
            r = await pool.query(
                `${projection}
                 WHERE e.bu_id = ANY($1::text[])
                   AND e.date >= $2::date AND e.date <= $3::date
                 ORDER BY e.date DESC, e.created_at DESC`,
                [buIds, from, to || from]
            );
        }
        res.json({ entries: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

module.exports = router;
