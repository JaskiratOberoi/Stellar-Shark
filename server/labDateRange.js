'use strict';

const { getDefaultDateIso } = require('../scraper/genomicsStatsScraper');

function addDaysIso(iso, delta) {
    const m = String(iso)
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`Invalid ISO date: ${iso}`);
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const dt = new Date(y, mo - 1, da);
    dt.setDate(dt.getDate() + delta);
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${mm}-${dd}`;
}

/**
 * Worksheet date range for a scheduled run (lab calendar in TZ from getDefaultDateIso).
 * @param {string} preset - today | yesterday | last7 | mtd | ytd
 */
function computeRangeForPreset(preset) {
    const today = getDefaultDateIso();
    const p = String(preset || 'today').trim() || 'today';
    if (p === 'yesterday') {
        const y = addDaysIso(today, -1);
        return { dateFromIso: y, dateToIso: y };
    }
    if (p === 'last7') {
        return { dateFromIso: addDaysIso(today, -6), dateToIso: today };
    }
    if (p === 'mtd') {
        return { dateFromIso: `${today.slice(0, 7)}-01`, dateToIso: today };
    }
    if (p === 'ytd') {
        return { dateFromIso: `${today.slice(0, 4)}-01-01`, dateToIso: today };
    }
    return { dateFromIso: today, dateToIso: today };
}

module.exports = { computeRangeForPreset, addDaysIso };
