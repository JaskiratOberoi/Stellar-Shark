'use strict';

const path = require('path');
const puppeteer = require('puppeteer');
const {
    buildListecPuppeteerLaunchOptions,
    applyChromiumExecutablePathEnv,
    applyPageLowMemoryOptimizations
} = require('./lis_puppeteer_launch.js');
const {
    loginAndOpenWorksheet,
    setBusinessUnit,
    setStatus,
    clearTestCode,
    setTestCode,
    setWorksheetDateRange,
    goToFirstSampleGridPage,
    getSampleGridPagerInfo,
    navigateToNextSampleGridPage,
    waitForSampleGridPageTurn,
    firstSidOnSampleGrid,
    readCurrentPageSampleRows,
    resolveExecutablePath,
    getSampleGridFingerprint,
    waitForGridRefreshAfterSearch
} = require('./lisNav.js');
const constants = require('./constants.js');
const { DEFAULT_BUSINESS_UNIT, labBadgeForBusinessUnit } = constants;

const MAX_GRID_PAGES = 500;

function normalizeLabBadge(s) {
    return String(s || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

/**
 * +1 per SID when the row matches this BU’s badge rule:
 * - Configured badge non-empty: row’s span.badge text must match (case-insensitive).
 * - Configured badge empty (QUGEN / central): row must have no lab badge text.
 */
function contributionForBusinessUnitRow(row, businessUnit) {
    const wantRaw = String(labBadgeForBusinessUnit(businessUnit) || '').replace(/\s+/g, ' ').trim();
    const gotRaw = String(row.labBadge || '').replace(/\s+/g, ' ').trim();

    if (!wantRaw) {
        if (!gotRaw) return 1;
        return 0;
    }

    if (!gotRaw) return 0;
    return normalizeLabBadge(gotRaw) === normalizeLabBadge(wantRaw) ? 1 : 0;
}

function normalizeSidKey(sid) {
    return String(sid || '').trim().toUpperCase();
}

/** Stable sort for display (case-insensitive, numeric-friendly). */
function sortSidDisplayValues(values) {
    return [...values].sort((a, b) =>
        normalizeSidKey(a).localeCompare(normalizeSidKey(b), undefined, { numeric: true, sensitivity: 'base' })
    );
}

/** Interpret YYYY-MM-DD as the lab calendar date (no TZ shift). */
function isoDateToDdMmYyyy(iso) {
    const m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`Invalid date (expected YYYY-MM-DD): ${iso}`);
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
}

function getDefaultDateIso() {
    const tz = process.env.TZ || 'Asia/Kolkata';
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = fmt.formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const da = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${mo}-${da}`;
}

function checkAborted(signal) {
    if (signal && signal.aborted) {
        const r = signal.reason;
        if (r instanceof Error) throw r;
        const err = new Error('Run cancelled');
        err.name = 'AbortError';
        throw err;
    }
}

/** Wall-clock cap + user cancel; always call `dispose()` in a `finally` after starting the browser. */
function combineUserAndTimeoutSignal(userSignal, timeoutMs) {
    const out = new AbortController();
    let timer = setTimeout(() => {
        timer = null;
        if (!out.signal.aborted) {
            const err = new Error(
                `Run exceeded maximum duration (${Math.round(timeoutMs / 60000)} min). Increase GENOMICS_RUN_MAX_MS if needed.`
            );
            err.name = 'TimeoutError';
            out.abort(err);
        }
    }, timeoutMs);

    const onUserAbort = () => {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
        if (!out.signal.aborted) {
            const err = new Error('Run cancelled');
            err.name = 'AbortError';
            out.abort(err);
        }
    };

    if (userSignal?.aborted) {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
        onUserAbort();
    } else if (userSignal) {
        userSignal.addEventListener('abort', onUserAbort, { once: true });
    }

    return {
        signal: out.signal,
        dispose() {
            if (timer != null) {
                clearTimeout(timer);
                timer = null;
            }
        }
    };
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

/** @param {object} options */
function resolveBusinessUnits(options) {
    if (Array.isArray(options.businessUnits) && options.businessUnits.length > 0) {
        const seen = new Set();
        const out = [];
        for (const raw of options.businessUnits) {
            const s = String(raw || '').trim();
            if (!s || seen.has(s)) continue;
            seen.add(s);
            out.push(s);
        }
        if (out.length > 0) return out;
    }
    const single = String(options.businessUnit || DEFAULT_BUSINESS_UNIT).trim();
    return single ? [single] : [DEFAULT_BUSINESS_UNIT];
}

function assertKnownBusinessUnits(units) {
    const known = new Set(constants.BUSINESS_UNITS);
    for (const u of units) {
        if (!known.has(u)) {
            return `Unknown business unit "${u}". Use labels from config/businessUnits.json.`;
        }
    }
    return null;
}

/** QUGEN uses an empty badge (count only rows with no lab badge). Every other BU needs a real badge string in config. */
function assertLabBadgesConfigured(units) {
    for (const u of units) {
        const b = String(labBadgeForBusinessUnit(u) || '').trim();
        if (!b && u !== 'QUGEN') {
            return `Set "badge" in config/businessUnits.json for "${u}" (exact text inside the client-code span.badge in LIS). QUGEN is the only BU that uses an empty badge.`;
        }
    }
    return null;
}

/**
 * @param {object} options
 * @param {string} [options.dateIso] - YYYY-MM-DD (single day; same as dateFrom/dateTo)
 * @param {string} [options.dateFromIso] - YYYY-MM-DD range start
 * @param {string} [options.dateToIso] - YYYY-MM-DD range end (inclusive)
 * @param {string} [options.businessUnit] - single BU (used if businessUnits omitted)
 * @param {string[]} [options.businessUnits] - one run per BU, same session
 * @param {string} [options.testCode] - optional; empty/whitespace clears filter
 * @param {boolean} [options.headless]
 * @param {(evt: object) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 */
async function runGenomicsDailyCount(options = {}) {
    const def = getDefaultDateIso();
    const dateFromIso = String(options.dateFromIso || options.dateIso || def).trim();
    const dateToIso = String(options.dateToIso || options.dateIso || dateFromIso).trim();
    if (dateFromIso > dateToIso) {
        throw new Error(`Invalid range: dateFrom (${dateFromIso}) must be ≤ dateTo (${dateToIso})`);
    }

    constants.refreshBusinessUnitsFromDisk();
    let businessUnits = resolveBusinessUnits(options);
    businessUnits = businessUnits.map((u) => constants.resolveCanonicalBusinessUnitLabel(u));
    const unknownBu = assertKnownBusinessUnits(businessUnits);
    if (unknownBu) throw new Error(unknownBu);
    const badgeCfg = assertLabBadgesConfigured(businessUnits);
    if (badgeCfg) throw new Error(badgeCfg);

    const testCodeTrim = options.testCode != null ? String(options.testCode).trim() : '';
    const headless = options.headless !== false;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const userSignal = options.signal;
    const runMaxMs = Math.max(60_000, Number(process.env.GENOMICS_RUN_MAX_MS || 5_400_000));
    const deadline = combineUserAndTimeoutSignal(userSignal, runMaxMs);
    const signal = deadline.signal;

    const fromDdMm = isoDateToDdMmYyyy(dateFromIso);
    const toDdMm = isoDateToDdMmYyyy(dateToIso);
    const startedAt = Date.now();

    const launchOpts = buildListecPuppeteerLaunchOptions(headless);
    applyChromiumExecutablePathEnv(launchOpts);
    const executablePath = resolveExecutablePath();
    if (executablePath) launchOpts.executablePath = executablePath;

    let browser;
    try {
        browser = await puppeteer.launch(launchOpts);
    } catch (launchErr) {
        deadline.dispose();
        throw launchErr;
    }

    let page;
    try {
        page = await browser.newPage();
        await applyPageLowMemoryOptimizations(page);

        onProgress({ type: 'phase', phase: 'login', message: 'Logging in and opening worksheet…' });
        checkAborted(signal);
        await loginAndOpenWorksheet(page);

        const rangeLabel = dateFromIso === dateToIso ? fromDdMm : `${fromDdMm} → ${toDdMm}`;
        const filterHint = testCodeTrim ? ` · test code ${testCodeTrim}` : '';
        onProgress({
            type: 'phase',
            phase: 'filters',
            message: `${businessUnits.length} business unit(s), ${rangeLabel}${filterHint}`
        });

        let completedBuTestsSum = 0;
        let completedBuSidsSum = 0;
        const allResults = [];

        for (let bi = 0; bi < businessUnits.length; bi += 1) {
            const businessUnit = businessUnits[bi];
            checkAborted(signal);
            const buT0 = Date.now();
            onProgress({
                type: 'phase',
                phase: 'bu',
                businessUnit,
                buIndex: bi + 1,
                buTotal: businessUnits.length,
                message: `Business unit ${businessUnit} (${bi + 1}/${businessUnits.length}) · ${
                    labBadgeForBusinessUnit(businessUnit)
                        ? `lab badge ${labBadgeForBusinessUnit(businessUnit)}`
                        : 'no lab badge (count rows without badge)'
                }`
            });

            await setBusinessUnit(page, businessUnit);
            if (testCodeTrim) await setTestCode(page, testCodeTrim);
            else await clearTestCode(page);

            const dateResult = await setWorksheetDateRange(page, fromDdMm, toDdMm);
            if (bi === 0) {
                onProgress({
                    type: 'info',
                    message: `Date fields: from=${dateResult.fromOk ? 'ok' : 'miss'}, to=${dateResult.toOk ? 'ok' : 'miss'}`
                });
            }

            const statusAllOk = await trySetStatusAll(page);
            if (!statusAllOk) {
                onProgress({
                    type: 'warn',
                    businessUnit,
                    message:
                        'Could not set status to --All--; continuing with whatever the worksheet already has selected.'
                });
            } else {
                onProgress({
                    type: 'phase',
                    phase: 'grid',
                    businessUnit,
                    buIndex: bi + 1,
                    buTotal: businessUnits.length,
                    statusLabel: '--All--',
                    message: `${businessUnit} · status --All-- · paginating grid`
                });
            }

            const fpBeforeSearch = await getSampleGridFingerprint(page);
            const gridWait = await waitForGridRefreshAfterSearch(page, fpBeforeSearch, {
                signal,
                onSlowTick: ({ elapsedMs, pagerMax }) =>
                    onProgress({
                        type: 'info',
                        businessUnit,
                        statusLabel: '--All--',
                        message: `Waiting for full grid/pager (${Math.round(elapsedMs / 1000)}s, pager max page ${pagerMax ?? '—'})…`
                    })
            });
            if (!gridWait.searched) {
                throw new Error(`Search failed for business unit ${businessUnit}`);
            }
            if (gridWait.warn === 'grid_unchanged_after_timeout') {
                onProgress({
                    type: 'warn',
                    businessUnit,
                    message:
                        'Grid still matches pre-search snapshot after max wait — count may be wrong. Try a smaller date range or increase GENOMICS_GRID_WAIT_MS.'
                });
            } else if (gridWait.warn === 'accepted_after_timeout') {
                onProgress({
                    type: 'warn',
                    businessUnit,
                    message: 'Grid wait reached max time; continuing with the last loaded grid state.'
                });
            }

            await goToFirstSampleGridPage(page);

            /** @type {Map<string, string>} normalized key → first-seen display SID */
            const sidByKey = new Map();
            let totalTests = 0;
            let rowsScanned = 0;
            let pageIndex = 0;

            while (pageIndex < MAX_GRID_PAGES) {
                checkAborted(signal);
                const rows = await readCurrentPageSampleRows(page);
                for (const row of rows) {
                    rowsScanned += 1;
                    const key = normalizeSidKey(row.sid);
                    if (sidByKey.has(key)) continue;
                    const n = contributionForBusinessUnitRow(row, businessUnit);
                    if (n < 1) continue;
                    sidByKey.set(key, String(row.sid || '').trim());
                    totalTests += n;
                }

                onProgress({
                    type: 'progress',
                    businessUnit,
                    buIndex: bi + 1,
                    buTotal: businessUnits.length,
                    statusLabel: '--All--',
                    page: pageIndex + 1,
                    totalTestsSoFar: completedBuTestsSum + totalTests,
                    uniqueSids: completedBuSidsSum + sidByKey.size
                });

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
                pageIndex += 1;
            }

            if (pageIndex >= MAX_GRID_PAGES - 1) {
                onProgress({
                    type: 'warn',
                    businessUnit,
                    message: `Stopped after ${MAX_GRID_PAGES} pages (safety cap) for ${businessUnit}`
                });
            }

            const perStatus = [
                {
                    label: 'All statuses',
                    rowsScanned,
                    testsAdded: totalTests,
                    sidsNew: sidByKey.size,
                    pages: pageIndex + 1
                }
            ];

            const sidList = sortSidDisplayValues(sidByKey.values());
            completedBuTestsSum += totalTests;
            completedBuSidsSum += sidByKey.size;

            allResults.push({
                businessUnit,
                labBadge: labBadgeForBusinessUnit(businessUnit) || null,
                testCode: testCodeTrim || null,
                dateFrom: dateFromIso,
                dateTo: dateToIso,
                date:
                    dateFromIso === dateToIso
                        ? dateFromIso
                        : `${dateFromIso} → ${dateToIso}`,
                totalTests,
                uniqueSids: sidByKey.size,
                sidList,
                perStatus,
                durationMs: Date.now() - buT0
            });
        }

        const finishedAt = Date.now();
        const aggregateTotalTests = allResults.reduce((s, r) => s + r.totalTests, 0);
        const aggregateUniqueSidsSum = allResults.reduce((s, r) => s + r.uniqueSids, 0);

        let result;
        if (allResults.length === 1) {
            const r0 = allResults[0];
            result = {
                dateFrom: r0.dateFrom,
                dateTo: r0.dateTo,
                date: r0.date,
                businessUnit: r0.businessUnit,
                labBadge: r0.labBadge,
                testCode: r0.testCode,
                totalTests: r0.totalTests,
                uniqueSids: r0.uniqueSids,
                sidList: r0.sidList || [],
                perStatus: r0.perStatus,
                durationMs: finishedAt - startedAt,
                completedAt: new Date().toISOString()
            };
        } else {
            result = {
                multiBu: true,
                businessUnits: allResults.map((r) => r.businessUnit),
                results: allResults,
                aggregateTotalTests,
                aggregateUniqueSidsSum,
                dateFrom: dateFromIso,
                dateTo: dateToIso,
                date:
                    dateFromIso === dateToIso
                        ? dateFromIso
                        : `${dateFromIso} → ${dateToIso}`,
                testCode: testCodeTrim || null,
                labBadge: null,
                totalTests: aggregateTotalTests,
                uniqueSids: aggregateUniqueSidsSum,
                durationMs: finishedAt - startedAt,
                completedAt: new Date().toISOString()
            };
        }

        onProgress({ type: 'done', result });
        return result;
    } finally {
        try {
            if (page && typeof page.isClosed === 'function' && !page.isClosed()) {
                await page.close({ runBeforeUnload: false });
            }
        } catch (_) {
            /* ignore */
        }
        try {
            const proc = browser?.process?.();
            if (proc && !proc.killed) {
                proc.stderr?.unref?.();
                proc.stdout?.unref?.();
            }
        } catch (_) {
            /* ignore */
        }
        if (browser) await browser.close().catch(() => {});
        deadline.dispose();
    }
}

module.exports = {
    runGenomicsDailyCount,
    isoDateToDdMmYyyy,
    getDefaultDateIso
};

// CLI: node genomicsStatsScraper.js [--headed] [YYYY-MM-DD [YYYY-MM-DD]]
if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    const headed = process.argv.includes('--headed');
    const isos = process.argv.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
    const runOpts = {
        headless: !headed,
        onProgress: (e) => console.log(JSON.stringify(e))
    };
    if (isos.length >= 2) {
        runOpts.dateFromIso = isos[0];
        runOpts.dateToIso = isos[1];
    } else if (isos.length === 1) {
        runOpts.dateFromIso = isos[0];
        runOpts.dateToIso = isos[0];
    }
    runGenomicsDailyCount(runOpts)
        .then((r) => {
            console.log('\nRESULT', JSON.stringify(r, null, 2));
            process.exit(0);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
