'use strict';

const crypto = require('crypto');
const { getPool, useDatabase } = require('./db/pool');

function newId(prefix) {
    return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function matchStatus(a, b) {
    if (a == null || b == null) return 'pending';
    return Number(a) === Number(b) ? 'match' : 'mismatch';
}

/**
 * Extract per–business-unit LIS totals from a Teller (genomics scraper) result payload.
 * @returns {Array<{ label: string, lisTotal: number }>}
 */
function tellerRowsFromRunResult(result) {
    if (!result || typeof result !== 'object') return [];
    if (result.multiBu && Array.isArray(result.results)) {
        return result.results
            .map((r) => ({
                label: r.businessUnit,
                lisTotal: typeof r.totalTests === 'number' ? r.totalTests : null
            }))
            .filter((x) => x.label && x.lisTotal != null);
    }
    if (result.businessUnit && typeof result.totalTests === 'number') {
        return [{ label: result.businessUnit, lisTotal: result.totalTests }];
    }
    return [];
}

/**
 * When a Teller counter run completes, persist LIS totals into daily_validation.shark_count for comparison
 * with lab technician kit counts. (DB column name retained for compatibility.)
 * Only single-day runs (dateFrom === dateTo) are synced.
 *
 * @param {import('pg').Pool} pool
 * @param {object} result — scraper result object (same shape as stored in reports_runs.result)
 */
async function applyTellerCountsFromRunResult(pool, result) {
    const dateFrom = result?.dateFrom;
    const dateTo = result?.dateTo;
    if (!dateFrom || !dateTo || dateFrom !== dateTo) {
        return { ok: true, skipped: true, reason: 'single_day_only', dateFrom, dateTo };
    }
    const date = dateFrom;
    const rows = tellerRowsFromRunResult(result);
    if (!rows.length) {
        return { ok: true, skipped: true, reason: 'no_bu_totals' };
    }

    let machinesUpdated = 0;
    for (const { label, lisTotal } of rows) {
        const bu = await pool.query(
            `SELECT id FROM business_units WHERE name = $1 AND active = true LIMIT 1`,
            [label]
        );
        if (!bu.rows.length) continue;
        const buId = bu.rows[0].id;
        const machines = await pool.query(`SELECT id FROM machines WHERE bu_id = $1 AND active = true`, [buId]);
        for (const m of machines.rows) {
            await upsertLisCountForMachine(pool, date, buId, m.id, lisTotal);
            machinesUpdated += 1;
        }
    }

    return { ok: true, skipped: false, date, machinesUpdated };
}

async function upsertLisCountForMachine(pool, date, buId, machineId, lisTotal) {
    const existing = await pool.query(
        `SELECT lab_tech_count FROM daily_validation WHERE date = $1::date AND bu_id = $2 AND machine_id = $3`,
        [date, buId, machineId]
    );
    const labTech = existing.rows.length ? existing.rows[0].lab_tech_count : null;
    const status = matchStatus(lisTotal, labTech);
    const id = newId('val');
    await pool.query(
        `INSERT INTO daily_validation (id, date, bu_id, machine_id, shark_count, lab_tech_count, match_status)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7)
         ON CONFLICT (date, bu_id, machine_id) DO UPDATE SET
           shark_count = EXCLUDED.shark_count,
           match_status = CASE
             WHEN daily_validation.lab_tech_count IS NULL OR EXCLUDED.shark_count IS NULL THEN 'pending'
             WHEN daily_validation.lab_tech_count = EXCLUDED.shark_count THEN 'match'
             ELSE 'mismatch'
           END`,
        [id, date, buId, machineId, lisTotal, labTech, status]
    );
}

/**
 * Recompute lab technician kit totals from lab_entries for a date and upsert daily_validation.
 * Mirrors POST /api/admin/validation/recompute-lab.
 */
async function recomputeLabCountsForDate(pool, date) {
    const dateStr = String(date);
    const r = await pool.query(
        `SELECT bu_id, machine_id, COALESCE(SUM(kits_used), 0)::int AS kits_used
         FROM lab_entries
         WHERE date = $1::date
         GROUP BY bu_id, machine_id`,
        [dateStr]
    );
    let n = 0;
    for (const row of r.rows) {
        const labCount = row.kits_used;
        const existing = await pool.query(
            `SELECT shark_count FROM daily_validation WHERE date = $1::date AND bu_id = $2 AND machine_id = $3`,
            [dateStr, row.bu_id, row.machine_id]
        );
        const lisCount = existing.rows.length ? existing.rows[0].shark_count : null;
        const status = matchStatus(lisCount, labCount);
        const id = newId('val');
        await pool.query(
            `INSERT INTO daily_validation (id, date, bu_id, machine_id, shark_count, lab_tech_count, match_status)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7)
             ON CONFLICT (date, bu_id, machine_id) DO UPDATE SET
               lab_tech_count = EXCLUDED.lab_tech_count,
               match_status = CASE
                 WHEN daily_validation.shark_count IS NULL OR EXCLUDED.lab_tech_count IS NULL THEN 'pending'
                 WHEN daily_validation.shark_count = EXCLUDED.lab_tech_count THEN 'match'
                 ELSE 'mismatch'
               END`,
            [id, dateStr, row.bu_id, row.machine_id, lisCount, labCount, status]
        );
        n += 1;
    }
    return { updated: n };
}

async function maybeSyncValidationFromReportResult(result) {
    if (!useDatabase() || !result) return;
    try {
        const pool = getPool();
        const out = await applyTellerCountsFromRunResult(pool, result);
        if (!out.skipped && out.machinesUpdated > 0) {
            console.log(
                `[Nexus] validation: synced Teller LIS counts for ${out.date} (${out.machinesUpdated} machine row(s))`
            );
        }
    } catch (e) {
        console.error('[Nexus] validation sync from run result failed', e.message || e);
    }
}

async function maybeRecomputeLabAfterEntry(date) {
    if (!useDatabase() || !date) return;
    try {
        const pool = getPool();
        await recomputeLabCountsForDate(pool, date);
    } catch (e) {
        console.error('[Nexus] validation recompute after lab entry failed', e.message || e);
    }
}

module.exports = {
    matchStatus,
    applyTellerCountsFromRunResult,
    /** @deprecated use applyTellerCountsFromRunResult */
    applySharkCountsFromRunResult: applyTellerCountsFromRunResult,
    recomputeLabCountsForDate,
    maybeSyncValidationFromReportResult,
    maybeRecomputeLabAfterEntry
};
