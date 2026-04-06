'use strict';

/**
 * Logs into LIS, sets each business unit, searches the worksheet (--All--, date range),
 * samples gvSample rows across several pages, and picks the modal non-empty span.badge text.
 * Writes config/businessUnits.json (label + observed badge).
 *
 * Usage: from project root, with .env credentials:
 *   node scripts/discoverLabBadges.js
 *   DISCOVER_BADGE_HEADED=1 node scripts/discoverLabBadges.js   # visible browser
 *
 * Env:
 *   DISCOVER_BADGE_DAYS=45   date window ending today
 *   DISCOVER_BADGE_MAX_PAGES=8
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const puppeteer = require('puppeteer');
const {
    buildListecPuppeteerLaunchOptions,
    applyChromiumExecutablePathEnv,
    applyPageLowMemoryOptimizations
} = require('../scraper/lis_puppeteer_launch.js');
const {
    loginAndOpenWorksheet,
    setBusinessUnit,
    clearTestCode,
    setWorksheetDateRange,
    setStatus,
    readCurrentPageSampleRows,
    getSampleGridFingerprint,
    waitForGridRefreshAfterSearch,
    getSampleGridPagerInfo,
    navigateToNextSampleGridPage,
    waitForSampleGridPageTurn,
    firstSidOnSampleGrid,
    goToFirstSampleGridPage,
    resolveExecutablePath
} = require('../scraper/lisNav.js');
const { isoDateToDdMmYyyy, getDefaultDateIso } = require('../scraper/genomicsStatsScraper.js');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'businessUnits.json');

function addDaysIso(iso, delta) {
    const [y, mo, d] = iso.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    dt.setDate(dt.getDate() + delta);
    const y2 = dt.getFullYear();
    const m2 = String(dt.getMonth() + 1).padStart(2, '0');
    const d2 = String(dt.getDate()).padStart(2, '0');
    return `${y2}-${m2}-${d2}`;
}

function loadLabelsInOrder() {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!Array.isArray(raw)) throw new Error('businessUnits.json must be an array');
    return raw.map((x) => (typeof x === 'string' ? x : x.label)).filter(Boolean);
}

function tallyMode(tally) {
    let best = null;
    let bestCount = 0;
    for (const [k, v] of Object.entries(tally)) {
        if (v > bestCount) {
            best = k;
            bestCount = v;
        } else if (v === bestCount && k < best) {
            best = k;
        }
    }
    return best;
}

async function trySetStatusAll(page) {
    const candidates = ['--All--', '-- All --', 'All', '--ALL--'];
    for (const label of candidates) {
        try {
            const ok = await setStatus(page, label);
            if (ok) return true;
        } catch (_) {}
    }
    return false;
}

async function sampleBadgesAcrossPages(page, maxPages) {
    const tally = {};
    let pagesRead = 0;

    for (let p = 0; p < maxPages; p += 1) {
        const rows = await readCurrentPageSampleRows(page);
        pagesRead += 1;
        for (const r of rows) {
            const b = String(r.labBadge || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (!b) continue;
            tally[b] = (tally[b] || 0) + 1;
        }

        if (rows.length === 0) break;

        const pagerBefore = await getSampleGridPagerInfo(page);
        const firstBefore = await firstSidOnSampleGrid(page);
        const moved = await navigateToNextSampleGridPage(page);
        if (!moved) break;
        const turned = await waitForSampleGridPageTurn(
            page,
            firstBefore,
            pagerBefore?.currentPage ?? null,
            15000
        );
        if (!turned) break;
    }

    const mode = tallyMode(tally);
    const totalBadged = Object.values(tally).reduce((a, b) => a + b, 0);
    return { mode, tally, totalBadged, pagesRead, distinct: Object.keys(tally).length };
}

async function discoverOneBu(page, businessUnit, fromIso, toIso, gridWaitOpts, opts = {}) {
    const { skipBuSelect = false } = opts;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    if (!skipBuSelect) {
        await setBusinessUnit(page, businessUnit);
    }
    await clearTestCode(page);
    await setWorksheetDateRange(page, isoDateToDdMmYyyy(fromIso), isoDateToDdMmYyyy(toIso));
    await trySetStatusAll(page);

    const fp0 = await getSampleGridFingerprint(page);
    const gridWait = await waitForGridRefreshAfterSearch(page, fp0, gridWaitOpts);
    if (!gridWait.searched) {
        return { error: 'Search click failed', mode: null, tally: {}, totalBadged: 0, pagesRead: 0, distinct: 0 };
    }

    await goToFirstSampleGridPage(page);
    await page.waitForTimeout(400);

    const maxPages = Number(process.env.DISCOVER_BADGE_MAX_PAGES || 8);
    return sampleBadgesAcrossPages(page, maxPages);
}

async function main() {
    const headless = process.env.DISCOVER_BADGE_HEADED === '1' ? false : true;
    const discoverDays = Number(process.env.DISCOVER_BADGE_DAYS || 45);
    const toIso = getDefaultDateIso();
    const fromIso = addDaysIso(toIso, -discoverDays);
    const labels = loadLabelsInOrder();

    const gridWaitOpts = {
        timeoutMs: Number(process.env.GENOMICS_GRID_WAIT_MS || 240000),
        minStillMs: Number(process.env.GENOMICS_GRID_MIN_STILL_MS || 4000),
        stableNeed: Number(process.env.GENOMICS_GRID_STABLE_POLLS || 5),
        onSlowTick: ({ elapsedMs, pagerMax }) => {
            process.stderr.write(
                `    …grid settling ${Math.round(elapsedMs / 1000)}s (pager max ${pagerMax ?? '—'})\n`
            );
        }
    };

    const launchOpts = buildListecPuppeteerLaunchOptions(headless);
    applyChromiumExecutablePathEnv(launchOpts);
    const executablePath = resolveExecutablePath();
    if (executablePath) launchOpts.executablePath = executablePath;

    const browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await applyPageLowMemoryOptimizations(page);

    const out = [];
    try {
        console.log('Logging in and opening Sample Worksheet…');
        await loginAndOpenWorksheet(page);
        console.log(`Date range (primary): ${fromIso} → ${toIso} (${discoverDays} days)\n`);

        for (const label of labels) {
            process.stdout.write(`BU: ${label} … `);
            let r = await discoverOneBu(page, label, fromIso, toIso, gridWaitOpts);

            if (r.totalBadged === 0 && !r.error) {
                const fromWide = addDaysIso(toIso, -120);
                process.stderr.write(`\n  (no badges in ${discoverDays}d window, retry 120d) `);
                r = await discoverOneBu(page, label, fromWide, toIso, gridWaitOpts, { skipBuSelect: true });
            }

            if (r.error) {
                console.log(`ERROR: ${r.error}`);
                out.push({ label, badge: '' });
                continue;
            }

            if (!r.mode) {
                console.log(`no span.badge text found (${r.pagesRead} page(s), ${r.distinct} distinct)`);
                out.push({ label, badge: '' });
                continue;
            }

            if (r.distinct > 1) {
                const top = Object.entries(r.tally)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(', ');
                console.log(`badge "${r.mode}" (mixed: ${top})`);
            } else {
                console.log(`badge "${r.mode}"`);
            }

            out.push({ label, badge: r.mode });
        }

        const clean = out.map(({ label, badge }) => ({ label, badge: badge || '' }));
        const json = `${JSON.stringify(clean, null, 4)}\n`;
        fs.writeFileSync(CONFIG_PATH, json, 'utf8');
        console.log(`\nWrote ${CONFIG_PATH}`);
    } finally {
        await browser.close().catch(() => {});
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
