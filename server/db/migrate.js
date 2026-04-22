'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool, useDatabase } = require('./pool');

const SUPER_ADMIN_USERNAME = 'Jas';
const SUPER_ADMIN_PASSWORD = 'Jaskirat123';
const SUPER_ADMIN_ID = 'user-super-jas';

async function migrate() {
    if (!useDatabase()) return;

    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS reports_runs (
                id TEXT PRIMARY KEY,
                saved_at TIMESTAMPTZ NOT NULL,
                result JSONB NOT NULL,
                source TEXT,
                schedule_id TEXT,
                schedule_label TEXT,
                date_preset TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_reports_runs_saved_at ON reports_runs (saved_at DESC);
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS scheduler_schedules (
                id TEXT PRIMARY KEY,
                enabled BOOLEAN NOT NULL DEFAULT false,
                time_local TEXT NOT NULL,
                label TEXT NOT NULL DEFAULT '',
                business_units JSONB NOT NULL DEFAULT '[]'::jsonb,
                test_code TEXT NOT NULL DEFAULT '',
                headless BOOLEAN NOT NULL DEFAULT true,
                date_preset TEXT NOT NULL DEFAULT 'today'
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS scheduler_runs (
                id TEXT PRIMARY KEY,
                run_at TIMESTAMPTZ NOT NULL,
                schedule_id TEXT NOT NULL,
                schedule_label TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT,
                result JSONB
            );
            CREATE INDEX IF NOT EXISTS idx_scheduler_runs_run_at ON scheduler_runs (run_at DESC);
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('super_admin', 'lab_technician')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                active BOOLEAN NOT NULL DEFAULT true
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS business_units (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                badge TEXT NOT NULL DEFAULT '',
                active BOOLEAN NOT NULL DEFAULT true
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_bu_assignments (
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                bu_id TEXT NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, bu_id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS machines (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                model TEXT NOT NULL,
                bu_id TEXT NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
                calibration_kits_per_day INT NOT NULL DEFAULT 0,
                qc_kits_per_day INT NOT NULL DEFAULT 0,
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_machines_bu_id ON machines (bu_id);
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS kits (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT true
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS kit_machine_compat (
                kit_id TEXT NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
                machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
                PRIMARY KEY (kit_id, machine_id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS parameters (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT UNIQUE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS parameter_machine_mapping (
                parameter_id TEXT NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
                machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
                PRIMARY KEY (parameter_id, machine_id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS parameter_mapping_ui (
                id TEXT PRIMARY KEY,
                layout JSONB NOT NULL DEFAULT '{}'::jsonb,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_items (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK (type IN ('kit', 'card', 'lot')),
                kit_id TEXT REFERENCES kits(id) ON DELETE SET NULL,
                name TEXT NOT NULL,
                total_quantity INT NOT NULL DEFAULT 0,
                low_stock_threshold INT
            );
        `);

        await client.query(`
            ALTER TABLE machines ADD COLUMN IF NOT EXISTS calibration_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL;
        `);
        await client.query(`
            ALTER TABLE machines ADD COLUMN IF NOT EXISTS qc_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL;
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_bu (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
                bu_id TEXT NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
                quantity INT NOT NULL DEFAULT 0,
                low_stock_threshold INT,
                UNIQUE(item_id, bu_id)
            );
            CREATE INDEX IF NOT EXISTS idx_inventory_bu_bu_id ON inventory_bu (bu_id);
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_transactions (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
                bu_id TEXT REFERENCES business_units(id) ON DELETE SET NULL,
                quantity INT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('send', 'usage', 'calibration', 'qc', 'adjustment')),
                notes TEXT,
                created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions (created_at DESC);
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_entries (
                id TEXT PRIMARY KEY,
                date DATE NOT NULL,
                bu_id TEXT NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
                machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
                parameter_id TEXT REFERENCES parameters(id) ON DELETE SET NULL,
                value NUMERIC,
                kits_used INT NOT NULL DEFAULT 0,
                entered_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_lab_entries_date ON lab_entries (date DESC);
            CREATE INDEX IF NOT EXISTS idx_lab_entries_bu_date ON lab_entries (bu_id, date DESC);
        `);

        await client.query(`
            ALTER TABLE lab_entries
              ADD COLUMN IF NOT EXISTS entry_kind TEXT NOT NULL DEFAULT 'parameter'
                CHECK (entry_kind IN ('parameter','kits','qc','calibration','repeat'));
        `);
        // CHECK constraints are not refreshed by ADD COLUMN IF NOT EXISTS, so on
        // existing databases we drop and recreate it to admit 'repeat'.
        await client.query(`
            ALTER TABLE lab_entries DROP CONSTRAINT IF EXISTS lab_entries_entry_kind_check;
        `);
        await client.query(`
            ALTER TABLE lab_entries ADD CONSTRAINT lab_entries_entry_kind_check
              CHECK (entry_kind IN ('parameter','kits','qc','calibration','repeat'));
        `);
        await client.query(`
            ALTER TABLE lab_entries
              ADD COLUMN IF NOT EXISTS test_code TEXT;
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lab_entries_test_code
              ON lab_entries (test_code) WHERE test_code IS NOT NULL;
        `);
        await client.query(`
            UPDATE lab_entries
               SET entry_kind = 'kits'
             WHERE entry_kind = 'parameter'
               AND parameter_id IS NULL
               AND kits_used > 0;
        `);

        await client.query(`
            ALTER TABLE lab_entries
              ADD COLUMN IF NOT EXISTS sid TEXT;
        `);
        await client.query(`
            ALTER TABLE lab_entries
              ADD COLUMN IF NOT EXISTS repeat_reason TEXT;
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lab_entries_sid
              ON lab_entries (sid) WHERE sid IS NOT NULL;
        `);
        // Backfill pre-audit-trail repeat rows so the new CHECK can be added
        // without rejecting historical data.
        await client.query(`
            UPDATE lab_entries
               SET sid = 'LEGACY',
                   repeat_reason = 'Pre-audit-trail entry'
             WHERE entry_kind = 'repeat'
               AND (sid IS NULL OR repeat_reason IS NULL);
        `);
        await client.query(`
            ALTER TABLE lab_entries DROP CONSTRAINT IF EXISTS lab_entries_repeat_audit_check;
        `);
        await client.query(`
            ALTER TABLE lab_entries ADD CONSTRAINT lab_entries_repeat_audit_check
              CHECK ((entry_kind <> 'repeat') OR (sid IS NOT NULL AND repeat_reason IS NOT NULL));
        `);

        // daily_validation.shark_count holds LIS sample totals from the Teller counter (legacy column name).
        await client.query(`
            CREATE TABLE IF NOT EXISTS daily_validation (
                id TEXT PRIMARY KEY,
                date DATE NOT NULL,
                bu_id TEXT NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
                machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
                shark_count INT,
                lab_tech_count INT,
                match_status TEXT CHECK (match_status IN ('match', 'mismatch', 'pending')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (date, bu_id, machine_id)
            );
            CREATE INDEX IF NOT EXISTS idx_daily_validation_date ON daily_validation (date DESC);
        `);

        await seedBusinessUnits(client);
        await seedSuperAdmin(client);
    } finally {
        client.release();
    }
}

async function seedBusinessUnits(client) {
    const configPath = path.join(__dirname, '..', '..', 'config', 'businessUnits.json');
    if (!fs.existsSync(configPath)) return;
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return;
    }
    if (!Array.isArray(raw)) return;
    for (const entry of raw) {
        const name = typeof entry === 'string' ? entry : entry.label;
        if (!name || typeof name !== 'string') continue;
        const badge = typeof entry === 'object' && entry.badge != null ? String(entry.badge) : '';
        const id = slugId(name);
        await client.query(
            `INSERT INTO business_units (id, name, badge, active)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, badge = EXCLUDED.badge, active = true`,
            [id, name, badge]
        );
    }
}

function slugId(name) {
    const base = String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return base || `bu-${crypto.randomBytes(4).toString('hex')}`;
}

async function seedSuperAdmin(client) {
    const existing = await client.query(`SELECT 1 FROM users WHERE username = $1 LIMIT 1`, [
        SUPER_ADMIN_USERNAME
    ]);
    if (existing.rows.length > 0) return;

    const passwordHash = bcrypt.hashSync(SUPER_ADMIN_PASSWORD, 10);
    await client.query(
        `INSERT INTO users (id, username, password_hash, display_name, role, active)
         VALUES ($1, $2, $3, $4, 'super_admin', true)`,
        [SUPER_ADMIN_ID, SUPER_ADMIN_USERNAME, passwordHash, 'Super Admin']
    );
}

module.exports = { migrate };
