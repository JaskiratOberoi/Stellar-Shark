'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool, useDatabase } = require('../db/pool');
const { signToken, requireAuth, loadUserById, loadUserBus } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        if (!useDatabase()) {
            return res.status(503).json({ error: 'Database not configured. Set DATABASE_URL.' });
        }
        const username = req.body?.username != null ? String(req.body.username).trim() : '';
        const password = req.body?.password != null ? String(req.body.password) : '';
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const pool = getPool();
        const r = await pool.query(
            `SELECT id, username, password_hash, display_name, role, active FROM users WHERE username = $1`,
            [username]
        );
        if (r.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const u = r.rows[0];
        if (!u.active) {
            return res.status(403).json({ error: 'Account disabled' });
        }
        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = signToken({
            sub: u.id,
            username: u.username,
            role: u.role,
            displayName: u.display_name
        });
        const bus =
            u.role === 'lab_technician' ? (await loadUserBus(pool, u.id)) : [];
        res.json({
            token,
            user: {
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                role: u.role,
                businessUnits: bus
            }
        });
    } catch (err) {
        console.error('[auth] login', err);
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.get('/me', requireAuth, async (req, res) => {
    try {
        if (!useDatabase()) {
            return res.json({ user: null, guest: true });
        }
        if (!req.user) {
            return res.json({ user: null, guest: true });
        }
        const pool = getPool();
        const u = await loadUserById(pool, req.user.id);
        if (!u || !u.active) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const bus =
            u.role === 'lab_technician' ? (await loadUserBus(pool, u.id)) : [];
        res.json({
            user: {
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                role: u.role,
                businessUnits: bus
            },
            guest: false
        });
    } catch (err) {
        console.error('[auth] me', err);
        res.status(500).json({ error: err.message || String(err) });
    }
});

router.post('/logout', (_req, res) => {
    res.json({ ok: true });
});

module.exports = router;
