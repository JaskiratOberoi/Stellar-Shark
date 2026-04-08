const fs = require('fs');
const path = require('path');

/** Tried in order: entrypoint-relative (works if scraper lives under dist/), scraper-relative, cwd. */
function businessUnitsJsonCandidates() {
    const out = [];
    const fromEnv = process.env.NEXUS_CONFIG_DIR && String(process.env.NEXUS_CONFIG_DIR).trim();
    if (fromEnv) {
        out.push(path.join(fromEnv, 'businessUnits.json'));
    }
    const fromEnvFile = process.env.NEXUS_BUSINESS_UNITS_CONFIG && String(process.env.NEXUS_BUSINESS_UNITS_CONFIG).trim();
    if (fromEnvFile) {
        out.push(fromEnvFile);
    }
    try {
        if (require.main && require.main.filename) {
            const mainDir = path.dirname(require.main.filename);
            out.push(path.join(mainDir, '..', 'config', 'businessUnits.json'));
        }
    } catch (_) {
        /* ignore */
    }
    out.push(
        path.join(__dirname, '..', 'config', 'businessUnits.json'),
        path.join(process.cwd(), 'config', 'businessUnits.json'),
        path.join(process.cwd(), '..', 'config', 'businessUnits.json')
    );
    const seen = new Set();
    const uniq = [];
    for (const p of out) {
        const n = path.normalize(p);
        if (seen.has(n)) continue;
        seen.add(n);
        uniq.push(n);
    }
    return uniq;
}

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

function loadBusinessUnitEntries(options = {}) {
    const { quiet = false } = options;
    for (const p of businessUnitsJsonCandidates()) {
        try {
            if (!fs.existsSync(p)) continue;
            const raw = fs.readFileSync(p, 'utf8');
            const entries = normalizeBusinessUnitEntries(JSON.parse(raw));
            if (!quiet && process.env.NODE_ENV !== 'test') {
                console.info(`[nexus] Loaded ${entries.length} business unit(s) from ${p}`);
            }
            return entries;
        } catch (err) {
            console.warn(`[nexus] Could not read business units from ${p}:`, err.message || err);
        }
    }
    console.warn(
        '[nexus] WARNING: config/businessUnits.json not found or invalid — only QUGEN is allowed. ' +
            'Ensure config/ is copied next to the app (see Dockerfile) or run from the repo root.'
    );
    return [{ label: 'QUGEN', badge: '' }];
}

/** Mutable so we can reload from disk; use getters on module.exports (do not destructure BUSINESS_UNITS at import time). */
let businessUnitEntries = loadBusinessUnitEntries();
let businessUnitLabels = businessUnitEntries.map((e) => e.label);

function refreshBusinessUnitsFromDisk() {
    businessUnitEntries = loadBusinessUnitEntries({ quiet: true });
    businessUnitLabels = businessUnitEntries.map((e) => e.label);
}

function labBadgeForBusinessUnit(label) {
    const want = String(label || '').trim();
    const entry = businessUnitEntries.find((e) => e.label === want);
    return entry ? String(entry.badge || '').trim() : '';
}

/** Map UI / API string to the exact `label` in config (case-insensitive fallback). */
function resolveCanonicalBusinessUnitLabel(raw) {
    const s = String(raw || '').trim();
    if (!s) return s;
    const exact = businessUnitEntries.find((e) => e.label === s);
    if (exact) return exact.label;
    const fold = businessUnitEntries.find((e) => e.label.toLowerCase() === s.toLowerCase());
    return fold ? fold.label : s;
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
    get BUSINESS_UNITS() {
        return businessUnitLabels;
    },
    get BUSINESS_UNIT_ENTRIES() {
        return businessUnitEntries;
    },
    refreshBusinessUnitsFromDisk,
    resolveCanonicalBusinessUnitLabel,
    labBadgeForBusinessUnit
};
