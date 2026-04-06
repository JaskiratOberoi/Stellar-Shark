const fs = require('fs');
const path = require('path');

const businessUnitsPath = path.join(__dirname, '..', 'config', 'businessUnits.json');

/**
 * Each entry: { label, badge }. Badge is the exact inner text of span.badge in the client-code cell.
 * Empty string = no badge rule (only QUGEN uses this: count rows that have no lab badge).
 * Do not guess badges — fill from LIS inspect for each lab.
 */
function normalizeBusinessUnitEntries(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
        return [{ label: 'QUGEN', badge: '' }];
    }
    const out = [];
    for (const item of raw) {
        if (typeof item === 'string') {
            const label = item.trim();
            if (!label) continue;
            out.push({ label, badge: '' });
        } else if (item && typeof item.label === 'string') {
            const label = item.label.trim();
            if (!label) continue;
            const badge = 'badge' in item ? String(item.badge ?? '').trim() : '';
            out.push({ label, badge });
        }
    }
    return out.length > 0 ? out : [{ label: 'QUGEN', badge: '' }];
}

let BUSINESS_UNIT_ENTRIES;
try {
    BUSINESS_UNIT_ENTRIES = normalizeBusinessUnitEntries(JSON.parse(fs.readFileSync(businessUnitsPath, 'utf8')));
} catch (_) {
    BUSINESS_UNIT_ENTRIES = [{ label: 'QUGEN', badge: '' }];
}

const BUSINESS_UNITS = BUSINESS_UNIT_ENTRIES.map((e) => e.label);

function labBadgeForBusinessUnit(label) {
    const want = String(label || '').trim();
    const entry = BUSINESS_UNIT_ENTRIES.find((e) => e.label === want);
    return entry ? String(entry.badge || '').trim() : '';
}

/**
 * Canonical LIS `ddlStatus` values (Sample worksheet), excluding `--All--`.
 * Order matches the live dropdown; `--All--` is omitted so we scan each bucket once.
 *
 * Prefer runtime labels from `getWorksheetStatusOptionLabels()` — they stay in sync if
 * the LIS wording ever changes. This array is only a fallback if the DOM read fails.
 * `setStatus` also folds UK/US “authorised” ↔ “authorized” for other sites.
 */
const WORKSHEET_STATUS_LABELS = [
    'Registered',
    'Rejected',
    'Partially Tested',
    'Tested',
    'Partially Authorized',
    'Authorized',
    'Partially Printed',
    'Printed',
    'Pending'
];

const DEFAULT_BUSINESS_UNIT = 'QUGEN';

module.exports = {
    WORKSHEET_STATUS_LABELS,
    DEFAULT_BUSINESS_UNIT,
    BUSINESS_UNITS,
    BUSINESS_UNIT_ENTRIES,
    labBadgeForBusinessUnit
};
