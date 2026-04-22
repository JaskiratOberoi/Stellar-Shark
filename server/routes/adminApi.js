'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const { getPool, useDatabase } = require('../db/pool');
const { requireAuth, requireRole } = require('../auth');
const { recomputeLabCountsForDate, matchStatus } = require('../validationService');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('super_admin'));

function newId(prefix) {
    return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function slugId(name) {
    const base = String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return base || `x-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * For kit items only, derive tests_per_kit and supported_test_codes. Non-kit
 * always returns (null, null) so callers can store and ignore spurious input.
 * @returns {{ error?: string, testsPerKit: number | null, supportedTestCodes: string[] | null }}
 */
function parseKitInventoryFromBody(type, body) {
    if (type !== 'kit') {
        return { testsPerKit: null, supportedTestCodes: null };
    }
    let testsPerKit = null;
    if (body?.tests_per_kit != null && body.tests_per_kit !== '') {
        const n = Number(body.tests_per_kit);
        if (!Number.isFinite(n) || n <= 0 || n !== Math.floor(n)) {
            return { error: 'tests_per_kit must be a positive integer' };
        }
        testsPerKit = n;
    }
    let supportedTestCodes = null;
    if (body?.supported_test_codes != null) {
        if (!Array.isArray(body.supported_test_codes)) {
            return { error: 'supported_test_codes must be an array' };
        }
        const seen = new Set();
        const out = [];
        for (const x of body.supported_test_codes) {
            const c = String(x).trim().toUpperCase();
            if (!c) continue;
            if (c.length > 16) {
                return { error: 'Each test code is at most 16 characters' };
            }
            if (!seen.has(c)) {
                seen.add(c);
                out.push(c);
            }
        }
        supportedTestCodes = out.length ? out : null;
    }
    return { testsPerKit, supportedTestCodes };
}

// --- Business units ---
router.get('/business-units', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(
            `SELECT id, name, badge, active FROM business_units ORDER BY name`
        );
        res.json({ businessUnits: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/business-units', async (req, res) => {
    try {
        const name = req.body?.name != null ? String(req.body.name).trim() : '';
        const badge = req.body?.badge != null ? String(req.body.badge) : '';
        if (!name) return res.status(400).json({ error: 'name required' });
        const id = slugId(name);
        const pool = getPool();
        await pool.query(
            `INSERT INTO business_units (id, name, badge, active) VALUES ($1, $2, $3, true)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, badge = EXCLUDED.badge`,
            [id, name, badge]
        );
        const r = await pool.query(`SELECT * FROM business_units WHERE id = $1`, [id]);
        res.json({ businessUnit: r.rows[0] });
    } catch (err) {
        if (String(err.message || '').includes('unique')) {
            return res.status(409).json({ error: 'Business unit name already exists' });
        }
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.patch('/business-units/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const name = req.body?.name != null ? String(req.body.name).trim() : null;
        const badge = req.body?.badge != null ? String(req.body.badge) : null;
        const active = req.body?.active;
        const pool = getPool();
        const fields = [];
        const vals = [];
        let n = 1;
        if (name != null) {
            fields.push(`name = $${n++}`);
            vals.push(name);
        }
        if (badge != null) {
            fields.push(`badge = $${n++}`);
            vals.push(badge);
        }
        if (typeof active === 'boolean') {
            fields.push(`active = $${n++}`);
            vals.push(active);
        }
        if (!fields.length) return res.status(400).json({ error: 'No updates' });
        vals.push(id);
        await pool.query(
            `UPDATE business_units SET ${fields.join(', ')} WHERE id = $${n}`,
            vals
        );
        const r = await pool.query(`SELECT * FROM business_units WHERE id = $1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
        res.json({ businessUnit: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- Machines ---
router.get('/machines', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(
            `SELECT m.*, bu.name AS bu_name
             FROM machines m
             JOIN business_units bu ON bu.id = m.bu_id
             ORDER BY bu.name, m.name`
        );
        res.json({ machines: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/machines', async (req, res) => {
    try {
        const name = req.body?.name != null ? String(req.body.name).trim() : '';
        const model = req.body?.model != null ? String(req.body.model).trim() : '';
        const buId = req.body?.bu_id != null ? String(req.body.bu_id) : '';
        const calibrationKits = Number(req.body?.calibration_kits_per_day) || 0;
        const qcKits = Number(req.body?.qc_kits_per_day) || 0;
        const calibrationItemId = req.body?.calibration_item_id || null;
        const qcItemId = req.body?.qc_item_id || null;
        if (!name || !model || !buId) {
            return res.status(400).json({ error: 'name, model, bu_id required' });
        }
        const pool = getPool();
        const id = newId('mach');
        await pool.query(
            `INSERT INTO machines (
                id, name, model, bu_id, calibration_kits_per_day, qc_kits_per_day,
                active, calibration_item_id, qc_item_id
            ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)`,
            [
                id,
                name,
                model,
                buId,
                calibrationKits,
                qcKits,
                calibrationItemId,
                qcItemId
            ]
        );
        const r = await pool.query(`SELECT * FROM machines WHERE id = $1`, [id]);
        res.json({ machine: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.patch('/machines/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = getPool();
        const body = req.body || {};
        const fields = [];
        const vals = [];
        let n = 1;
        const map = {
            name: 'name',
            model: 'model',
            bu_id: 'bu_id',
            calibration_kits_per_day: 'calibration_kits_per_day',
            qc_kits_per_day: 'qc_kits_per_day',
            active: 'active',
            calibration_item_id: 'calibration_item_id',
            qc_item_id: 'qc_item_id'
        };
        for (const [k, col] of Object.entries(map)) {
            if (body[k] !== undefined) {
                fields.push(`${col} = $${n++}`);
                vals.push(body[k]);
            }
        }
        if (!fields.length) return res.status(400).json({ error: 'No updates' });
        vals.push(id);
        await pool.query(`UPDATE machines SET ${fields.join(', ')} WHERE id = $${n}`, vals);
        const r = await pool.query(`SELECT * FROM machines WHERE id = $1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
        res.json({ machine: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- Kits ---
router.get('/kits', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(`SELECT * FROM kits ORDER BY name`);
        res.json({ kits: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/kits', async (req, res) => {
    try {
        const name = req.body?.name != null ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'name required' });
        const id = newId('kit');
        const pool = getPool();
        await pool.query(`INSERT INTO kits (id, name, active) VALUES ($1, $2, true)`, [id, name]);
        const r = await pool.query(`SELECT * FROM kits WHERE id = $1`, [id]);
        res.json({ kit: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.patch('/kits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const name = req.body?.name != null ? String(req.body.name).trim() : null;
        const active = req.body?.active;
        const pool = getPool();
        if (name != null) await pool.query(`UPDATE kits SET name = $1 WHERE id = $2`, [name, id]);
        if (typeof active === 'boolean') {
            await pool.query(`UPDATE kits SET active = $1 WHERE id = $2`, [active, id]);
        }
        const r = await pool.query(`SELECT * FROM kits WHERE id = $1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
        res.json({ kit: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/kit-machine-compat', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(`SELECT kit_id, machine_id FROM kit_machine_compat`);
        res.json({ compat: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/kit-machine-compat', async (req, res) => {
    try {
        const kitId = req.body?.kit_id;
        const machineId = req.body?.machine_id;
        if (!kitId || !machineId) return res.status(400).json({ error: 'kit_id and machine_id required' });
        const pool = getPool();
        await pool.query(
            `INSERT INTO kit_machine_compat (kit_id, machine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [kitId, machineId]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.delete('/kit-machine-compat', async (req, res) => {
    try {
        const kitId = req.body?.kit_id;
        const machineId = req.body?.machine_id;
        if (!kitId || !machineId) return res.status(400).json({ error: 'kit_id and machine_id required' });
        const pool = getPool();
        await pool.query(`DELETE FROM kit_machine_compat WHERE kit_id = $1 AND machine_id = $2`, [
            kitId,
            machineId
        ]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- Parameters ---
router.get('/parameters', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(`SELECT * FROM parameters ORDER BY name`);
        res.json({ parameters: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/parameters', async (req, res) => {
    try {
        const name = req.body?.name != null ? String(req.body.name).trim() : '';
        const code = req.body?.code != null ? String(req.body.code).trim() : null;
        if (!name) return res.status(400).json({ error: 'name required' });
        const id = newId('param');
        const pool = getPool();
        await pool.query(`INSERT INTO parameters (id, name, code) VALUES ($1, $2, $3)`, [id, name, code]);
        const r = await pool.query(`SELECT * FROM parameters WHERE id = $1`, [id]);
        res.json({ parameter: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.patch('/parameters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const name = req.body?.name != null ? String(req.body.name).trim() : null;
        const code = req.body?.code !== undefined ? (req.body.code ? String(req.body.code).trim() : null) : null;
        const pool = getPool();
        if (name != null) await pool.query(`UPDATE parameters SET name = $1 WHERE id = $2`, [name, id]);
        if (code !== null) await pool.query(`UPDATE parameters SET code = $1 WHERE id = $2`, [code, id]);
        const r = await pool.query(`SELECT * FROM parameters WHERE id = $1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
        res.json({ parameter: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/parameter-mappings', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(
            `SELECT parameter_id, machine_id FROM parameter_machine_mapping`
        );
        res.json({ mappings: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/parameter-mappings', async (req, res) => {
    try {
        const parameterId = req.body?.parameter_id;
        const machineId = req.body?.machine_id;
        if (!parameterId || !machineId) {
            return res.status(400).json({ error: 'parameter_id and machine_id required' });
        }
        const pool = getPool();
        await pool.query(
            `INSERT INTO parameter_machine_mapping (parameter_id, machine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [parameterId, machineId]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.delete('/parameter-mappings', async (req, res) => {
    try {
        const parameterId = req.body?.parameter_id;
        const machineId = req.body?.machine_id;
        if (!parameterId || !machineId) {
            return res.status(400).json({ error: 'parameter_id and machine_id required' });
        }
        const pool = getPool();
        await pool.query(
            `DELETE FROM parameter_machine_mapping WHERE parameter_id = $1 AND machine_id = $2`,
            [parameterId, machineId]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/parameter-mapping-ui', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(`SELECT * FROM parameter_mapping_ui WHERE id = 'default'`);
        if (!r.rows.length) {
            return res.json({ layout: { nodes: [], edges: [] } });
        }
        res.json({ layout: r.rows[0].layout });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.put('/parameter-mapping-ui', async (req, res) => {
    try {
        const layout = req.body?.layout;
        if (layout == null || typeof layout !== 'object') {
            return res.status(400).json({ error: 'layout object required' });
        }
        const pool = getPool();
        await pool.query(
            `INSERT INTO parameter_mapping_ui (id, layout, updated_at)
             VALUES ('default', $1::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET layout = EXCLUDED.layout, updated_at = NOW()`,
            [JSON.stringify(layout)]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- Users ---
router.get('/users', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(
            `SELECT id, username, display_name, role, active, created_at FROM users ORDER BY created_at DESC`
        );
        const users = [];
        for (const u of r.rows) {
            const bus = await loadUserBus(pool, u.id);
            users.push({ ...u, businessUnits: bus });
        }
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

async function loadUserBus(pool, userId) {
    const r = await pool.query(
        `SELECT bu.id, bu.name, bu.badge
         FROM user_bu_assignments uba
         JOIN business_units bu ON bu.id = uba.bu_id
         WHERE uba.user_id = $1`,
        [userId]
    );
    return r.rows;
}

router.post('/users', async (req, res) => {
    try {
        const username = req.body?.username != null ? String(req.body.username).trim() : '';
        const password = req.body?.password != null ? String(req.body.password) : '';
        const displayName = req.body?.display_name != null ? String(req.body.display_name).trim() : '';
        const role = req.body?.role === 'lab_technician' ? 'lab_technician' : null;
        const buIds = Array.isArray(req.body?.bu_ids) ? req.body.bu_ids.map(String) : [];
        if (!username || !password || !displayName || !role) {
            return res.status(400).json({ error: 'username, password, display_name, role=lab_technician required' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters.' });
        }
        if (role !== 'lab_technician') {
            return res.status(400).json({ error: 'Only lab_technician can be created here' });
        }
        const pool = getPool();
        const id = newId('user');
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO users (id, username, password_hash, display_name, role, active)
             VALUES ($1, $2, $3, $4, $5, true)`,
            [id, username, hash, displayName, role]
        );
        for (const buId of buIds) {
            await pool.query(`INSERT INTO user_bu_assignments (user_id, bu_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
                id,
                buId
            ]);
        }
        const r = await pool.query(`SELECT id, username, display_name, role, active FROM users WHERE id = $1`, [id]);
        const bus = await loadUserBus(pool, id);
        res.json({ user: { ...r.rows[0], businessUnits: bus } });
    } catch (err) {
        if (String(err.message || '').includes('unique')) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.patch('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = getPool();
        const body = req.body || {};

        // Footgun guard: a super admin cannot deactivate their own account
        // (would lock them out of the only role that can re-enable it).
        if (body.active === false && req.user?.id === id) {
            return res.status(409).json({ error: 'You cannot deactivate your own account.' });
        }

        // Password sanity: reject empty / whitespace-only updates so a slipped
        // PATCH doesn't silently set someone's hash to bcrypt('').
        if (body.password != null) {
            const pw = String(body.password);
            if (pw.length < 4) {
                return res.status(400).json({ error: 'Password must be at least 4 characters.' });
            }
            const hash = await bcrypt.hash(pw, 10);
            await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id]);
        }
        if (body.display_name != null) {
            const dn = String(body.display_name).trim();
            if (!dn) return res.status(400).json({ error: 'Display name cannot be empty.' });
            await pool.query(`UPDATE users SET display_name = $1 WHERE id = $2`, [dn, id]);
        }
        if (typeof body.active === 'boolean') {
            await pool.query(`UPDATE users SET active = $1 WHERE id = $2`, [body.active, id]);
        }
        if (Array.isArray(body.bu_ids)) {
            await pool.query(`DELETE FROM user_bu_assignments WHERE user_id = $1`, [id]);
            for (const buId of body.bu_ids.map(String)) {
                await pool.query(`INSERT INTO user_bu_assignments (user_id, bu_id) VALUES ($1, $2)`, [id, buId]);
            }
        }
        const r = await pool.query(`SELECT id, username, display_name, role, active FROM users WHERE id = $1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
        const bus = await loadUserBus(pool, id);
        res.json({ user: { ...r.rows[0], businessUnits: bus } });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- Inventory ---
router.get('/inventory/items', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(`SELECT * FROM inventory_items ORDER BY name`);
        res.json({ items: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/inventory/items', async (req, res) => {
    try {
        const type = req.body?.type;
        const name = req.body?.name != null ? String(req.body.name).trim() : '';
        const kitId = req.body?.kit_id || null;
        const totalQuantity = Number(req.body?.total_quantity) || 0;
        const lowStock = req.body?.low_stock_threshold != null ? Number(req.body.low_stock_threshold) : null;
        if (!['kit', 'card', 'lot'].includes(type) || !name) {
            return res.status(400).json({ error: 'type (kit|card|lot) and name required' });
        }
        const kit = parseKitInventoryFromBody(type, req.body);
        if (kit.error) {
            return res.status(400).json({ error: kit.error });
        }
        const id = newId('inv');
        const pool = getPool();
        await pool.query(
            `INSERT INTO inventory_items
               (id, type, kit_id, name, total_quantity, low_stock_threshold, tests_per_kit, supported_test_codes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, type, kitId, name, totalQuantity, lowStock, kit.testsPerKit, kit.supportedTestCodes]
        );
        const r = await pool.query(`SELECT * FROM inventory_items WHERE id = $1`, [id]);
        res.json({ item: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.patch('/inventory/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = getPool();
        const body = req.body || {};
        const cur = await pool.query(`SELECT type FROM inventory_items WHERE id = $1`, [id]);
        if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
        const itemType = cur.rows[0].type;
        const fields = [];
        const vals = [];
        let n = 1;
        if (body.name != null) {
            fields.push(`name = $${n++}`);
            vals.push(String(body.name));
        }
        if (body.total_quantity != null) {
            fields.push(`total_quantity = $${n++}`);
            vals.push(Number(body.total_quantity));
        }
        if (body.low_stock_threshold !== undefined) {
            fields.push(`low_stock_threshold = $${n++}`);
            vals.push(body.low_stock_threshold == null ? null : Number(body.low_stock_threshold));
        }
        if (itemType === 'kit') {
            if (body.tests_per_kit !== undefined) {
                if (body.tests_per_kit == null || body.tests_per_kit === '') {
                    fields.push(`tests_per_kit = $${n++}`);
                    vals.push(null);
                } else {
                    const num = Number(body.tests_per_kit);
                    if (!Number.isFinite(num) || num <= 0 || num !== Math.floor(num)) {
                        return res.status(400).json({ error: 'tests_per_kit must be a positive integer' });
                    }
                    fields.push(`tests_per_kit = $${n++}`);
                    vals.push(num);
                }
            }
            if (body.supported_test_codes !== undefined) {
                const k = parseKitInventoryFromBody('kit', { supported_test_codes: body.supported_test_codes });
                if (k.error) {
                    return res.status(400).json({ error: k.error });
                }
                fields.push(`supported_test_codes = $${n++}`);
                vals.push(k.supportedTestCodes);
            }
        }
        if (!fields.length) return res.status(400).json({ error: 'No updates' });
        vals.push(id);
        await pool.query(`UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${n}`, vals);
        const r = await pool.query(`SELECT * FROM inventory_items WHERE id = $1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
        res.json({ item: r.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/inventory/by-bu', async (_req, res) => {
    try {
        const pool = getPool();
        const r = await pool.query(
            `SELECT ib.*,
                    bu.name AS bu_name,
                    i.name AS item_name,
                    i.type AS item_type,
                    i.tests_per_kit,
                    i.supported_test_codes,
                    (ib.quantity * COALESCE(i.tests_per_kit, 0))::int AS tests_remaining
             FROM inventory_bu ib
             JOIN business_units bu ON bu.id = ib.bu_id
             JOIN inventory_items i ON i.id = ib.item_id
             ORDER BY bu.name, i.name`
        );
        res.json({ rows: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/inventory/send', async (req, res) => {
    try {
        const itemId = req.body?.item_id;
        const buId = req.body?.bu_id;
        const quantity = Number(req.body?.quantity);
        const notes = req.body?.notes != null ? String(req.body.notes) : null;
        const userId = req.user?.id;
        if (!itemId || !buId || !Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ error: 'item_id, bu_id, quantity>0 required' });
        }
        const pool = getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = await client.query(`SELECT total_quantity FROM inventory_items WHERE id = $1 FOR UPDATE`, [
                itemId
            ]);
            if (!cur.rows.length) throw new Error('Item not found');
            if (cur.rows[0].total_quantity < quantity) throw new Error('Insufficient central stock');
            await client.query(`UPDATE inventory_items SET total_quantity = total_quantity - $1 WHERE id = $2`, [
                quantity,
                itemId
            ]);
            const existing = await client.query(
                `SELECT id, quantity FROM inventory_bu WHERE item_id = $1 AND bu_id = $2`,
                [itemId, buId]
            );
            if (existing.rows.length) {
                await client.query(`UPDATE inventory_bu SET quantity = quantity + $1 WHERE id = $2`, [
                    quantity,
                    existing.rows[0].id
                ]);
            } else {
                const ibId = newId('ibu');
                await client.query(
                    `INSERT INTO inventory_bu (id, item_id, bu_id, quantity) VALUES ($1, $2, $3, $4)`,
                    [ibId, itemId, buId, quantity]
                );
            }
            const txnId = newId('txn');
            await client.query(
                `INSERT INTO inventory_transactions (id, item_id, bu_id, quantity, type, notes, created_by)
                 VALUES ($1, $2, $3, $4, 'send', $5, $6)`,
                [txnId, itemId, buId, quantity, notes, userId || null]
            );
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: err.message || String(err) });
    }
});

router.get('/inventory/transactions', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 200, 500);
        const pool = getPool();
        const r = await pool.query(
            `SELECT t.*, i.name AS item_name, bu.name AS bu_name
             FROM inventory_transactions t
             LEFT JOIN inventory_items i ON i.id = t.item_id
             LEFT JOIN business_units bu ON bu.id = t.bu_id
             ORDER BY t.created_at DESC
             LIMIT $1`,
            [limit]
        );
        res.json({ transactions: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/inventory/daily-deduction', async (req, res) => {
    try {
        const dateStr = req.body?.date != null ? String(req.body.date) : '';
        if (!dateStr) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
        const pool = getPool();
        const machines = await pool.query(
            `SELECT id, bu_id, calibration_kits_per_day, qc_kits_per_day, calibration_item_id, qc_item_id
             FROM machines WHERE active = true`
        );
        const userId = req.user?.id;
        let applied = 0;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const m of machines.rows) {
                const deduct = async (qty, itemId, type) => {
                    if (!itemId || !qty || qty <= 0) return;
                    const ib = await client.query(
                        `SELECT id, quantity FROM inventory_bu WHERE item_id = $1 AND bu_id = $2 FOR UPDATE`,
                        [itemId, m.bu_id]
                    );
                    if (!ib.rows.length) return;
                    const newQ = Math.max(0, ib.rows[0].quantity - qty);
                    await client.query(`UPDATE inventory_bu SET quantity = $1 WHERE id = $2`, [newQ, ib.rows[0].id]);
                    const txnId = newId('txn');
                    await client.query(
                        `INSERT INTO inventory_transactions (id, item_id, bu_id, quantity, type, notes, created_by)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            txnId,
                            itemId,
                            m.bu_id,
                            qty,
                            type,
                            `Daily ${type} for machine ${m.id} on ${dateStr}`,
                            userId || null
                        ]
                    );
                    applied += 1;
                };
                await deduct(m.calibration_kits_per_day, m.calibration_item_id, 'calibration');
                await deduct(m.qc_kits_per_day, m.qc_item_id, 'qc');
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        res.json({ ok: true, transactionsCreated: applied });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- Validation ---
router.get('/validation', async (req, res) => {
    try {
        const from = req.query.from || req.query.date;
        const to = req.query.to || from;
        if (!from) return res.status(400).json({ error: 'from or date query required' });
        const pool = getPool();
        const r = await pool.query(
            `SELECT v.*, bu.name AS bu_name, m.name AS machine_name
             FROM daily_validation v
             JOIN business_units bu ON bu.id = v.bu_id
             JOIN machines m ON m.id = v.machine_id
             WHERE v.date >= $1::date AND v.date <= $2::date
             ORDER BY v.date DESC, bu.name, m.name`,
            [from, to || from]
        );
        res.json({ rows: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/validation/upsert', async (req, res) => {
    try {
        const date = req.body?.date != null ? String(req.body.date) : '';
        const buId = req.body?.bu_id;
        const machineId = req.body?.machine_id;
        const lisCountIn = req.body?.shark_count;
        const labIn = req.body?.lab_tech_count;
        if (!date || !buId || !machineId) {
            return res.status(400).json({ error: 'date, bu_id, machine_id required' });
        }
        const pool = getPool();
        const existing = await pool.query(
            `SELECT shark_count, lab_tech_count FROM daily_validation WHERE date = $1::date AND bu_id = $2 AND machine_id = $3`,
            [date, buId, machineId]
        );
        const prev = existing.rows[0] || {};
        const lisCount = lisCountIn !== undefined ? (lisCountIn == null ? null : Number(lisCountIn)) : prev.shark_count;
        const labTechCount = labIn !== undefined ? (labIn == null ? null : Number(labIn)) : prev.lab_tech_count;
        const status = matchStatus(lisCount, labTechCount);
        const id = newId('val');
        await pool.query(
            `INSERT INTO daily_validation (id, date, bu_id, machine_id, shark_count, lab_tech_count, match_status)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7)
             ON CONFLICT (date, bu_id, machine_id) DO UPDATE SET
               shark_count = EXCLUDED.shark_count,
               lab_tech_count = EXCLUDED.lab_tech_count,
               match_status = EXCLUDED.match_status`,
            [id, date, buId, machineId, lisCount, labTechCount, status]
        );
        res.json({ ok: true, match_status: status });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/validation/recompute-lab', async (req, res) => {
    try {
        const date = req.body?.date != null ? String(req.body.date) : '';
        if (!date) return res.status(400).json({ error: 'date required' });
        const pool = getPool();
        const { updated } = await recomputeLabCountsForDate(pool, date);
        res.json({ ok: true, updated });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/dashboard', async (_req, res) => {
    try {
        const pool = getPool();
        const [bus, machines, kits, params, items] = await Promise.all([
            pool.query(`SELECT COUNT(*)::int AS c FROM business_units WHERE active`),
            pool.query(`SELECT COUNT(*)::int AS c FROM machines WHERE active`),
            pool.query(`SELECT COUNT(*)::int AS c FROM kits WHERE active`),
            pool.query(`SELECT COUNT(*)::int AS c FROM parameters`),
            pool.query(`SELECT COUNT(*)::int AS c FROM inventory_items`)
        ]);
        res.json({
            counts: {
                businessUnits: bus.rows[0].c,
                machines: machines.rows[0].c,
                kits: kits.rows[0].c,
                parameters: params.rows[0].c,
                inventoryItems: items.rows[0].c
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

module.exports = router;
