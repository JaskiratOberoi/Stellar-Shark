'use strict';

/**
 * LIS Sample Worksheet navigation (read-only helpers).
 * Patterns adapted from Autobots cbc_reader_bot.js and gallbladder_autobot.js (date fields).
 */

const fs = require('fs');

/** Same defaults as Autobots `cbc_reader_bot.js` (PRIMARY_LOGIN_URL, BACKUP_LOGIN_URL, CBC_LOGIN_*). */
const CBC_DEFAULT_PRIMARY_LOGIN_URL = 'http://122.161.198.159:88/login.aspx';
const CBC_DEFAULT_BACKUP_LOGIN_URL = 'http://192.168.1.51:88/login.aspx?ReturnUrl=%2f';
const CBC_DEFAULT_USERNAME = 'JASKIRAT';
const CBC_DEFAULT_PASSWORD = 'JASKIRAT@123';

function escapeXPathText(value) {
    const text = String(value ?? '');
    if (!text.includes("'")) return `'${text}'`;
    if (!text.includes('"')) return `"${text}"`;
    const parts = text.split("'").map((part) => `'${part}'`);
    return `concat(${parts.join(`, "'", `)})`;
}

async function waitForElement(page, xpaths, timeout = 10000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
        for (const xpath of xpaths) {
            const handles = await page.$x(xpath);
            if (handles && handles.length > 0) return handles[0];
        }
        await page.waitForTimeout(120);
    }
    throw new Error(`Element not found for XPaths: ${xpaths.join(' | ')}`);
}

async function clickElement(page, xpaths, options = {}) {
    const retries = Number(options.retries ?? 3);
    const waitTimeout = Number(options.waitTimeout ?? 8000);
    let lastError = null;
    for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
            const handle = await waitForElement(page, xpaths, waitTimeout);
            await page.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }), handle);
            await page.waitForTimeout(80);
            try {
                await handle.click({ delay: 40 });
            } catch (_) {
                await page.evaluate((el) => {
                    if (!el) return;
                    el.removeAttribute('disabled');
                    el.removeAttribute('readonly');
                    if (typeof el.click === 'function') el.click();
                    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                }, handle);
            }
            return;
        } catch (error) {
            lastError = error;
            await page.waitForTimeout(150);
        }
    }
    throw lastError || new Error('clickElement failed');
}

async function typeElement(page, xpaths, value) {
    const handle = await waitForElement(page, xpaths, 8000);
    await handle.click({ clickCount: 3, delay: 25 });
    await page.keyboard.press('Backspace');
    await handle.type(String(value ?? ''), { delay: 15 });
}

function resolveExecutablePath() {
    const envCandidates = [
        process.env.CHROMIUM_EXECUTABLE_PATH,
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH
    ]
        .map((v) => String(v || '').trim())
        .filter(Boolean);

    for (const candidate of envCandidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    const platformCandidates =
        process.platform === 'darwin'
            ? [
                  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                  '/Applications/Chromium.app/Contents/MacOS/Chromium',
                  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
              ]
            : [];

    for (const candidate of platformCandidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return undefined;
}

function getLoginUrls() {
    const primary = String(
        process.env.LIS_LOGIN_URL || process.env.CBC_LOGIN_URL || CBC_DEFAULT_PRIMARY_LOGIN_URL
    ).trim();
    const backup = String(
        process.env.LIS_LOGIN_URL_BACKUP || process.env.CBC_LOGIN_URL_BACKUP || CBC_DEFAULT_BACKUP_LOGIN_URL
    ).trim();
    if (!primary) {
        throw new Error('Set LIS_LOGIN_URL or CBC_LOGIN_URL (or rely on CBC default primary URL)');
    }
    return { primary, backup: backup || null };
}

/** LIS_* overrides CBC_*; both match `cbc_reader_bot.js` when unset (including defaults). */
function getLisCredentials() {
    const user = String(
        process.env.LIS_LOGIN_USERNAME || process.env.CBC_LOGIN_USERNAME || CBC_DEFAULT_USERNAME
    ).trim();
    const pass = String(
        process.env.LIS_LOGIN_PASSWORD || process.env.CBC_LOGIN_PASSWORD || CBC_DEFAULT_PASSWORD
    ).trim();
    if (!user || !pass) {
        throw new Error('Set LIS_LOGIN_* or CBC_LOGIN_USERNAME / CBC_LOGIN_PASSWORD');
    }
    return { user, pass };
}

async function loginAndOpenWorksheet(page) {
    const { primary, backup } = getLoginUrls();
    const { user, pass } = getLisCredentials();

    try {
        await page.goto(primary, { waitUntil: 'networkidle2', timeout: 45000 });
    } catch (_) {
        if (backup) {
            await page.goto(backup, { waitUntil: 'networkidle2', timeout: 45000 });
        } else {
            throw new Error(`Could not reach LIS_LOGIN_URL: ${primary}`);
        }
    }

    await typeElement(page, ["//input[@type='text']"], user);
    await typeElement(page, ["//input[@type='password']"], pass);
    await clickElement(page, [
        "//button[contains(text(), 'Login')]",
        "//input[@type='submit' and contains(@value, 'Login')]",
        "//button[@type='submit']",
        "//input[@type='submit']"
    ]);

    await page.waitForXPath("//nav[@id='sidebar']", { timeout: 20000 }).catch(() => page.waitForTimeout(2000));
    await clickElement(page, [
        "//nav[@id='sidebar']//a[@data-toggle='collapse' and @href='#Worksheet']",
        "//a[@data-toggle='collapse' and @href='#Worksheet']"
    ]);
    await page.waitForTimeout(500);
    let submenuClicked = false;
    try {
        await clickElement(page, [
            "//ul[@id='Worksheet']//a[contains(@href, 'Sampleworksheet.aspx')]",
            "//ul[@id='Worksheet']//a[contains(@href, 'Sampleworksheet')]",
            "//ul[@id='Worksheet']//a[normalize-space(text())='Worksheet']",
            "//a[contains(translate(@href, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sampleworksheet')]"
        ]);
        submenuClicked = true;
    } catch (_) {}

    if (!submenuClicked) {
        const opened = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const target = links.find((a) => {
                const href = String(a.getAttribute('href') || '').toLowerCase();
                const text = String(a.textContent || '').trim().toLowerCase();
                return href.includes('sampleworksheet') || (text === 'worksheet' && href.includes('worksheet'));
            });
            if (!target) return false;
            target.click();
            return true;
        });
        if (!opened) throw new Error('Could not open Worksheet submenu');
    }
    await page.waitForTimeout(1800);
}

async function setBusinessUnit(page, businessUnit) {
    const setDirect = await page.evaluate((label) => {
        const want = String(label || '').trim();
        const select =
            document.querySelector("select[id*='ddlBunit']") ||
            document.querySelector("select[name*='ddlBunit']") ||
            document.querySelector("select[id*='BusinessUnit']") ||
            document.querySelector("select[name*='BusinessUnit']");
        if (!select) return false;
        const opts = Array.from(select.options || []);
        const target =
            opts.find((o) => (o.text || '').trim().toLowerCase() === want.toLowerCase()) ||
            opts.find((o) => (o.text || '').trim() === want);
        if (!target) return false;
        select.value = target.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.jQuery && window.jQuery(select).data('select2')) {
            window.jQuery(select).val(target.value).trigger('change');
        }
        return true;
    }, businessUnit);
    if (setDirect) {
        await page.waitForTimeout(450);
        return;
    }

    await clickElement(page, [
        "//span[contains(@class, 'select2-selection') and @title='Business Unit']",
        "//select[contains(@id,'ddlBunit') or contains(@name,'ddlBunit')]/following::span[contains(@class,'select2-selection')][1]",
        "//select[contains(@id,'BusinessUnit') or contains(@name,'BusinessUnit')]/following::span[contains(@class,'select2-selection')][1]",
        "//select[contains(@id,'Bunit') or contains(@name,'Bunit')]/following::span[contains(@class,'select2-selection')][1]"
    ]);
    await page.waitForTimeout(450);
    await clickElement(page, [
        `//li[contains(@class, 'select2-results__option') and normalize-space(text())=${escapeXPathText(businessUnit)}]`,
        `//li[contains(@class, 'select2-results__option') and contains(text(), ${escapeXPathText(businessUnit)})]`
    ]);
}

/**
 * Exact status labels from the LIS ddlStatus <select> (excludes "--All--").
 * Prefer this over a hardcoded list so spellings match (e.g. Authorised vs Authorized).
 */
async function getWorksheetStatusOptionLabels(page) {
    try {
        await page.waitForSelector("select[id*='ddlStatus'], select[name*='ddlStatus']", { timeout: 12000 });
    } catch (_) {
        return [];
    }
    return page.evaluate(() => {
        const select = document.querySelector("select[id*='ddlStatus'], select[name*='ddlStatus']");
        if (!select) return [];
        return Array.from(select.options || [])
            .map((o) => String(o.text || '').trim())
            .filter((t) => {
                if (!t) return false;
                const compact = t.replace(/\s+/g, ' ').trim();
                if (/^--\s*all\s*--$/i.test(compact)) return false;
                return true;
            });
    });
}


async function setStatus(page, statusLabel) {

    const setDirect = await page.evaluate((label) => {
        const fold = (x) =>
            String(x || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\bauthorised\b/g, 'authorized')
                .replace(/\bauthorisd\b/g, 'authorized');
        const select = document.querySelector("select[id*='ddlStatus'], select[name*='ddlStatus']");
        if (!select) return false;
        const opts = Array.from(select.options || []);
        const want = String(label || '').trim();
        const target =
            opts.find((o) => (o.text || '').trim().toLowerCase() === want.toLowerCase()) ||
            opts.find((o) => fold(o.text) === fold(want));
        if (!target) return false;
        select.value = target.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.jQuery && window.jQuery(select).data('select2')) {
            window.jQuery(select).val(target.value).trigger('change');
        }
        return true;
    }, statusLabel);
    if (setDirect) {
        await page.waitForTimeout(180);
        return true;
    }

    const resolvedForUi = await page.evaluate((want) => {
        const fold = (x) =>
            String(x || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\bauthorised\b/g, 'authorized')
                .replace(/\bauthorisd\b/g, 'authorized');
        const select = document.querySelector("select[id*='ddlStatus'], select[name*='ddlStatus']");
        if (!select) return String(want || '').trim();
        const opts = Array.from(select.options || []);
        const w = String(want || '').trim();
        const target =
            opts.find((o) => (o.text || '').trim().toLowerCase() === w.toLowerCase()) ||
            opts.find((o) => fold(o.text) === fold(w));
        return target ? String(target.text || '').trim() : w;
    }, statusLabel);

    try {
        await clickElement(
            page,
            [
                "//select[contains(@id, 'ddlStatus')]/following::span[contains(@class, 'select2-selection')][1]",
                "//span[contains(@class, 'select2-selection') and @title='Status']"
            ],
            { retries: 2, waitTimeout: 1500 }
        );
        await page.waitForTimeout(200);
        await clickElement(
            page,
            [
                `//li[contains(@class, 'select2-results__option') and normalize-space(text())=${escapeXPathText(resolvedForUi)}]`,
                `//li[contains(@class, 'select2-results__option') and contains(text(), ${escapeXPathText(resolvedForUi)})]`
            ],
            { retries: 2, waitTimeout: 1500 }
        );
        return true;
    } catch (_) {
        return false;
    }
}

async function clearTestCode(page) {
    const ok = await page.evaluate(() => {
        const el =
            document.querySelector("input[id*='txtTestcode']") || document.querySelector("input[name*='txtTestcode']");
        if (!el) return false;
        el.removeAttribute('readonly');
        el.removeAttribute('disabled');
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    });
    if (!ok) {
        try {
            await typeElement(page, ["//input[contains(@id, 'txtTestcode')]", "//input[contains(@name, 'txtTestcode')]"], '');
        } catch (_) {
            /* optional field */
        }
    }
    await page.waitForTimeout(120);
}

/** Sets worksheet test code filter; trim empty clears the field (same as clearTestCode). */
async function setTestCode(page, code) {
    const text = String(code ?? '').trim();
    if (!text) {
        await clearTestCode(page);
        return;
    }
    const ok = await page.evaluate((val) => {
        const el =
            document.querySelector("input[id*='txtTestcode']") || document.querySelector("input[name*='txtTestcode']");
        if (!el) return false;
        el.removeAttribute('readonly');
        el.removeAttribute('disabled');
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }, text);
    if (!ok) {
        await typeElement(
            page,
            ["//input[contains(@id, 'txtTestcode')]", "//input[contains(@name, 'txtTestcode')]"],
            text
        );
    }
    await page.waitForTimeout(120);
}

async function setDateFieldOnPage(page, xpaths, dateStr) {
    const valueText = String(dateStr ?? '').trim();
    try {
        const element = await waitForElement(page, xpaths, 8000);
        await page.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }), element);
        await page.waitForTimeout(60);
        return await page.evaluate((el, val) => {
            if (!el || !('value' in el)) return false;
            el.removeAttribute('readonly');
            el.removeAttribute('disabled');
            el.removeAttribute('maxlength');
            el.focus();
            el.value = '';
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            return (el.value || '').trim() === val;
        }, element, valueText);
    } catch (_) {
        return false;
    }
}

/** Set worksheet From / To (dd/mm/yyyy). Same or different ends of a range. */
async function setWorksheetDateRange(page, fromDdMmYyyy, toDdMmYyyy) {
    const fromXpaths = [
        "//input[@id='ctl00_ContentPlaceHolder_Main_txtFdate']",
        "//input[@name='ctl00$ContentPlaceHolder_Main$txtFdate']",
        "//input[contains(@id, 'txtFdate')]",
        "//input[contains(@name, 'txtFdate')]",
        "//input[contains(@id, 'Fdate')]"
    ];
    const toXpaths = [
        "//input[@id='ctl00_ContentPlaceHolder_Main_txtTodate']",
        "//input[@name='ctl00$ContentPlaceHolder_Main$txtTodate']",
        "//input[contains(@id, 'txtTodate')]",
        "//input[contains(@name, 'txtTodate')]",
        "//input[@id='ctl00_ContentPlaceHolder_Main_txtTdate']",
        "//input[@name='ctl00$ContentPlaceHolder_Main$txtTdate']",
        "//input[contains(@id, 'txtTdate')]",
        "//input[contains(@name, 'txtTdate')]",
        "//input[contains(@id, 'Todate')]",
        "//input[contains(@id, 'Tdate')]"
    ];
    const fromOk = await setDateFieldOnPage(page, fromXpaths, fromDdMmYyyy);
    await page.waitForTimeout(120);
    const toOk = await setDateFieldOnPage(page, toXpaths, toDdMmYyyy);
    await page.waitForTimeout(120);
    return { fromOk, toOk };
}

async function setWorksheetDateRangeSameDay(page, ddMmYyyy) {
    return setWorksheetDateRange(page, ddMmYyyy, ddMmYyyy);
}

async function clickSearch(page) {
    const clickedViaDom = await page.evaluate(() => {
        const el =
            document.querySelector("input[id*='btnSearch']") ||
            document.querySelector("input[type='submit'][value*='Search']") ||
            Array.from(document.querySelectorAll('button')).find((b) => /search/i.test(String(b.textContent || '')));
        if (!el) return false;
        if (typeof el.click === 'function') el.click();
        return true;
    });
    if (clickedViaDom) {
        await page.waitForTimeout(350);
        return true;
    }
    try {
        await clickElement(page, [
            "//input[contains(@id, 'btnSearch')]",
            "//input[@type='submit' and contains(@value, 'Search')]",
            "//button[contains(text(), 'Search')]"
        ], { retries: 2, waitTimeout: 1500 });
        await page.waitForTimeout(350);
        return true;
    } catch (_) {
        return false;
    }
}

async function waitForSampleGridAfterSearch(page, timeoutMs = 15000) {
    try {
        await page.waitForSelector('table[id*="gvSample"]', { timeout: timeoutMs });
    } catch (_) {}
    await page.waitForTimeout(400);
}

async function goToFirstSampleGridPage(page) {
    const clicked = await page.evaluate(() => {
        const grid = document.querySelector('table[id*="gvSample"]');
        const pgrRow = grid?.querySelector('tr.pgr, tr[class*="pgr"]');
        if (!pgrRow) return false;
        const nested = pgrRow.querySelector('table');
        const scope = nested || pgrRow;
        const links = Array.from(scope.querySelectorAll('a'));
        const link1 = links.find((a) => (a.textContent || '').trim() === '1');
        if (link1 && !link1.classList.contains('aspNetDisabled')) {
            link1.click();
            return true;
        }
        return false;
    });
    if (clicked) await page.waitForTimeout(600);
    return true;
}

async function firstSidOnSampleGrid(page) {
    const sids = await listSidsForCurrentPage(page);
    return sids.length ? sids[0] : null;
}

async function listSidsForCurrentPage(page) {
    return page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table[id*='gvSample'] tbody tr, table[id*='gv'] tbody tr"));
        const unique = new Set();
        const out = [];
        const badValues = new Set(['save', 'desc', 'x', 'result', 'export']);
        const sidRegex = /^[A-Za-z0-9-]{5,}$/;
        for (const row of rows) {
            const table = row.closest('table');
            const tableId = String((table && table.id) || '').toLowerCase();
            if (!tableId.includes('gvsample')) continue;
            const sidLink = row.querySelector("a[id*='hpVail'], td:nth-child(4) a");
            if (!sidLink) continue;
            const sid = String(sidLink.textContent || sidLink.innerText || '').trim();
            const sidLower = sid.toLowerCase();
            if (!sidRegex.test(sid) || badValues.has(sidLower)) continue;
            if (!sid || unique.has(sid)) continue;
            unique.add(sid);
            out.push(sid);
        }
        return out;
    });
}

async function getSampleGridPagerInfo(page) {
    return page.evaluate(() => {
        const grid = document.querySelector('table[id*="gvSample"]');
        const pgrRow = grid
            ? grid.querySelector('tr.pgr, tr[class*="pgr"]')
            : document.querySelector('tr.pgr, tr[class*="pgr"]');
        if (!pgrRow) return null;
        const nestedTable = pgrRow.querySelector('table');
        const tds = nestedTable
            ? Array.from(nestedTable.querySelectorAll('td'))
            : Array.from(pgrRow.querySelectorAll('td'));
        const elements = [];
        for (const td of tds) {
            const children = td.querySelectorAll('a, span');
            if (children.length) elements.push(...Array.from(children));
            else {
                const text = (td.textContent || '').trim();
                const n = parseInt(text, 10);
                if (!Number.isNaN(n) && n >= 1) elements.push(td);
            }
        }
        let currentPageNum = null;
        for (const el of elements) {
            const text = (el.textContent || '').trim();
            const n = parseInt(text, 10);
            if (Number.isNaN(n) || n < 1) continue;
            const isSpan = el.tagName === 'SPAN';
            const isActive =
                isSpan ||
                el.classList.contains('active') ||
                window.getComputedStyle(el).fontWeight === 'bold' ||
                el.closest('td')?.classList?.toString().includes('selected');
            if (isActive && currentPageNum === null) currentPageNum = n;
        }
        const allPages = [
            ...new Set(
                elements
                    .map((el) => parseInt((el.textContent || '').trim(), 10))
                    .filter((n) => !Number.isNaN(n) && n >= 1)
            )
        ].sort((a, b) => a - b);
        if (allPages.length === 0) return null;
        return { currentPage: currentPageNum || allPages[0], allPages: allPages.map((num) => ({ number: num })) };
    });
}

async function navigateToNextSampleGridPage(page) {
    const info = await getSampleGridPagerInfo(page);
    const currentPage = info?.currentPage ?? 1;
    const availablePages = info?.allPages ? info.allPages.map((p) => p.number) : [];
    const nextNum = availablePages.find((p) => p > currentPage);

    if (nextNum != null) {
        const clicked = await page.evaluate((targetPage) => {
            const grid = document.querySelector('table[id*="gvSample"]');
            const pgrRow = grid
                ? grid.querySelector('tr.pgr, tr[class*="pgr"]')
                : document.querySelector('tr.pgr, tr[class*="pgr"]');
            if (!pgrRow) return false;
            const links = Array.from(pgrRow.querySelectorAll('a'));
            const link = links.find((a) => (a.textContent || '').trim() === String(targetPage));
            if (!link) return false;
            if (link.classList.contains('aspNetDisabled')) return false;
            link.click();
            return true;
        }, nextNum);
        if (clicked) return true;
    }

    const nextViaDom = await page.evaluate(() => {
        const grid = document.querySelector('table[id*="gvSample"]');
        const pgrRow = grid
            ? grid.querySelector('tr.pgr, tr[class*="pgr"]')
            : document.querySelector('tr.pgr, tr[class*="pgr"]');
        const scope = pgrRow || grid || document;

        const tryClick = (el) => {
            if (!el || el.disabled) return false;
            const cls = String(el.className || '');
            if (cls.includes('aspNetDisabled') || cls.includes('disabled')) return false;
            el.removeAttribute('disabled');
            if (typeof el.click === 'function') el.click();
            return true;
        };

        const anchors = Array.from(scope.querySelectorAll('a'));
        for (const a of anchors) {
            const t = (a.textContent || '').trim();
            const oc = String(a.getAttribute('onclick') || '');
            const href = String(a.getAttribute('href') || '');
            if (/Page\$Next/i.test(oc) || /Page\$Next/i.test(href)) {
                if (tryClick(a)) return true;
            }
            if (t === 'Next' || t === '>' || t === '»') {
                if (tryClick(a)) return true;
            }
        }

        const byId =
            document.querySelector("a[id*='lnkNext']") ||
            document.querySelector("a[id*='LinkButton'][id*='Next']");
        if (byId && tryClick(byId)) return true;

        return false;
    });
    if (nextViaDom) return true;

    try {
        const handles = await page.$x(
            "//table[contains(@id,'gvSample')]//tr[contains(@class,'pgr')]//a[" +
                "contains(translate(normalize-space(text()), 'NEXT', 'next'), 'next') or " +
                "contains(@onclick, 'Page$Next') or contains(@href, 'Page$Next')]"
        );
        if (handles && handles.length > 0) {
            const el = handles[0];
            const disabled = await page.evaluate(
                (node) =>
                    !node || node.classList.contains('aspNetDisabled') || node.classList.contains('disabled'),
                el
            );
            if (!disabled) {
                await page.evaluate((node) => node.scrollIntoView({ block: 'center' }), el);
                await page.waitForTimeout(80);
                await el.click();
                return true;
            }
        }
    } catch (_) {}

    return false;
}

async function waitForSampleGridPageTurn(page, prevFirstSid, prevPagerPage, timeoutMs = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        await page.waitForTimeout(200);
        const first = await firstSidOnSampleGrid(page);
        if (prevFirstSid != null && first != null && first !== prevFirstSid) return true;
        if (prevFirstSid == null && first != null) return true;
        const info = await getSampleGridPagerInfo(page);
        if (info && prevPagerPage != null && info.currentPage != null && info.currentPage !== prevPagerPage) {
            return true;
        }
    }
    return false;
}

/**
 * Data rows on gvSample: SID link and optional lab badge from client code cell (`lblmccCode` + `span.badge`).
 */
async function readCurrentPageSampleRows(page) {
    return page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table[id*='gvSample'] tbody tr"));
        const badValues = new Set(['save', 'desc', 'x', 'result', 'export']);
        const sidRegex = /^[A-Za-z0-9-]{5,}$/;
        const out = [];
        for (const row of rows) {
            const table = row.closest('table');
            if (!table || !String(table.id || '').toLowerCase().includes('gvsample')) continue;
            const sidLink = row.querySelector("a[id*='hpVail'], td:nth-child(4) a");
            if (!sidLink) continue;
            const sid = String(sidLink.textContent || sidLink.innerText || '').trim();
            const sidLower = sid.toLowerCase();
            if (!sidRegex.test(sid) || badValues.has(sidLower)) continue;
            let labBadge = '';
            const mccSpan = row.querySelector('span[id*="lblmccCode"]');
            if (mccSpan) {
                const badgeEl = mccSpan.querySelector('span.badge');
                if (badgeEl) {
                    labBadge = String(badgeEl.textContent || badgeEl.innerText || '')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
            }
            out.push({ sid, labBadge });
        }
        return out;
    });
}

function gridFingerprintsEqual(a, b) {
    if (!a || !b) return false;
    return (
        a.sidKey === b.sidKey &&
        a.rowCount === b.rowCount &&
        a.firstSid === b.firstSid &&
        a.pagerCurrent === b.pagerCurrent &&
        a.pagerMax === b.pagerMax &&
        a.pagerLinkCount === b.pagerLinkCount &&
        (a.pagerStrip || '') === (b.pagerStrip || '')
    );
}

async function isAjaxLoadingVisible(page) {
    return page.evaluate(() => {
        const sel =
            '[id*="UpdateProgress"], .UpdateProgress, [class*="update-progress"], [id*="divLoading"], [id*="Loading"]';
        const nodes = document.querySelectorAll(sel);
        for (const el of nodes) {
            const st = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            if (st.display === 'none' || st.visibility === 'hidden') continue;
            if (parseFloat(st.opacity || '1') < 0.05) continue;
            return true;
        }
        return false;
    });
}

/**
 * Snapshot of gvSample page 1 + pager (max page, strip text).
 * Pager fields matter: LIS often updates rows first then pager; stabilizing on SIDs alone under-counts huge ranges.
 */
async function getSampleGridFingerprint(page) {
    try {
        await page.waitForSelector('table[id*="gvSample"]', { timeout: 12000 });
    } catch (_) {}
    const pagerStrip = await page.evaluate(() => {
        const grid = document.querySelector('table[id*="gvSample"]');
        const pgrRow = grid?.querySelector('tr.pgr, tr[class*="pgr"]');
        if (!pgrRow) return '';
        return (pgrRow.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 520);
    });
    const rows = await readCurrentPageSampleRows(page);
    const pager = await getSampleGridPagerInfo(page);
    let firstSid = rows.length ? rows[0].sid : '';
    if (!firstSid) {
        const fs = await firstSidOnSampleGrid(page);
        firstSid = fs || '';
    }
    const nums = pager?.allPages?.map((p) => p.number) || [];
    let pagerMax = nums.length > 0 ? Math.max(...nums) : pager?.currentPage ?? 0;
    if (rows.length > 0 && pagerMax < 1) {
        pagerMax = 1;
    }
    return {
        rowCount: rows.length,
        sidKey: rows.map((r) => r.sid).join('\u001f'),
        firstSid,
        pagerCurrent: pager?.currentPage ?? -1,
        pagerMax,
        pagerLinkCount: pager?.allPages?.length ?? 0,
        pagerStrip
    };
}

/**
 * Clicks Search, waits for the worksheet POST to finish, then waits until the grid + pager stop changing
 * (quiescence). Large month ranges often update the pager (max page) after row data — old logic treated
 * two identical page-1 snapshots as "done" and under-counted badly.
 *
 * @param {import('puppeteer').Page} page
 * @param {object} beforeFp - snapshot before Search (for unchanged warning only)
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {(info: { elapsedMs: number, pagerMax?: number }) => void} [options.onSlowTick]
 */
async function waitForGridRefreshAfterSearch(page, beforeFp, options = {}) {
    const timeoutMs = options.timeoutMs ?? Number(process.env.GENOMICS_GRID_WAIT_MS || 480000);
    const pollMs = options.pollMs ?? 700;
    const stableNeed = options.stableNeed ?? Number(process.env.GENOMICS_GRID_STABLE_POLLS || 7);
    const minStillMs = options.minStillMs ?? Number(process.env.GENOMICS_GRID_MIN_STILL_MS || 6000);
    const signal = options.signal;
    const onSlowTick = options.onSlowTick;

    const overallStart = Date.now();
    let lastSlowTick = 0;

    const postMatchesWorksheet = (res) => {
        const u = res.url().toLowerCase();
        if (res.request().method() !== 'POST') return false;
        if (!res.ok()) return false;
        return u.includes('sampleworksheet') || (u.includes('worksheet') && u.includes('.aspx'));
    };

    const respTimeout = Math.min(timeoutMs, Number(process.env.GENOMICS_POST_WAIT_MS || 120000));
    const respPromise = page.waitForResponse(postMatchesWorksheet, { timeout: respTimeout }).catch(() => null);

    const searched = await clickSearch(page);
    if (!searched) {
        return { searched: false };
    }

    await respPromise;

    if (typeof page.waitForNetworkIdle === 'function') {
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 90000 }).catch(() => {});
    }

    let lastFp = await getSampleGridFingerprint(page);
    let stableCount = 1;
    let lastChangeAt = Date.now();

    while (Date.now() - overallStart < timeoutMs) {
        if (signal?.aborted) {
            const e = new Error('Run cancelled');
            e.name = 'AbortError';
            throw e;
        }

        if (await isAjaxLoadingVisible(page)) {
            stableCount = 0;
            await page.waitForTimeout(pollMs);
            lastFp = await getSampleGridFingerprint(page);
            lastChangeAt = Date.now();
            stableCount = 1;
            continue;
        }

        const elapsed = Date.now() - overallStart;
        if (onSlowTick && elapsed - lastSlowTick >= 8000) {
            onSlowTick({ elapsedMs: elapsed, pagerMax: lastFp?.pagerMax });
            lastSlowTick = elapsed;
        }

        await page.waitForTimeout(pollMs);
        const cur = await getSampleGridFingerprint(page);

        if (gridFingerprintsEqual(cur, lastFp)) {
            stableCount += 1;
            if (stableCount >= stableNeed && Date.now() - lastChangeAt >= minStillMs) {
                return { searched: true, ok: true, fingerprint: cur };
            }
        } else {
            lastFp = cur;
            stableCount = 1;
            lastChangeAt = Date.now();
        }
    }

    const finalFp = await getSampleGridFingerprint(page);
    const unchanged = gridFingerprintsEqual(finalFp, beforeFp);
    return {
        searched: true,
        ok: !unchanged,
        fingerprint: finalFp,
        warn: unchanged ? 'grid_unchanged_after_timeout' : 'accepted_after_timeout'
    };
}

module.exports = {
    escapeXPathText,
    waitForElement,
    clickElement,
    typeElement,
    resolveExecutablePath,
    loginAndOpenWorksheet,
    setBusinessUnit,
    getWorksheetStatusOptionLabels,
    setStatus,
    clearTestCode,
    setTestCode,
    setWorksheetDateRange,
    setWorksheetDateRangeSameDay,
    clickSearch,
    waitForSampleGridAfterSearch,
    getSampleGridFingerprint,
    waitForGridRefreshAfterSearch,
    goToFirstSampleGridPage,
    firstSidOnSampleGrid,
    listSidsForCurrentPage,
    getSampleGridPagerInfo,
    navigateToNextSampleGridPage,
    waitForSampleGridPageTurn,
    readCurrentPageSampleRows
};
