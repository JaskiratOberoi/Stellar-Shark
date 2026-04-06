'use strict';

/**
 * Puppeteer launch helpers for LIS automation.
 * Adapted from Stellar Autobots lis_puppeteer_launch.js
 */

const os = require('os');

let lowMemoryProfileLogged = false;

function isLowMemoryHost() {
    if (process.env.GENOMICS_LOW_MEMORY === '0') return false;
    if (process.env.GENOMICS_LOW_MEMORY === '1') return true;
    if (process.env.CBC_LOW_MEMORY === '0') return false;
    if (process.env.CBC_LOW_MEMORY === '1') return true;
    try {
        return os.totalmem() < 5 * 1024 * 1024 * 1024;
    } catch {
        return false;
    }
}

function chromiumLowMemoryArgs() {
    return [
        '--mute-audio',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--disable-default-apps',
        '--disable-breakpad',
        '--disable-component-update',
        '--disable-client-side-phishing-detection',
        '--disable-domain-reliability',
        '--disable-features=AudioServiceOutOfProcess,MediaRouter,OptimizationHints',
        '--disk-cache-size=1048576',
        '--media-cache-size=1',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--renderer-process-limit=2'
    ];
}

function buildListecPuppeteerLaunchOptions(isHeadless, overrides = {}) {
    const lowMem = isLowMemoryHost();
    if (lowMem && !lowMemoryProfileLogged) {
        lowMemoryProfileLogged = true;
        console.log('[Genomics] Low-memory Chromium profile enabled.');
    }

    const headlessArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking'
    ];
    if (lowMem) headlessArgs.push(...chromiumLowMemoryArgs());

    const headedArgs = ['--start-maximized'];
    if (lowMem) headedArgs.push(...chromiumLowMemoryArgs());

    return {
        headless: isHeadless ? 'new' : false,
        defaultViewport: null,
        args: isHeadless ? headlessArgs : headedArgs,
        ...overrides
    };
}

function applyChromiumExecutablePathEnv(launchOptions) {
    const chromiumPath =
        (process.env.CHROMIUM_EXECUTABLE_PATH && String(process.env.CHROMIUM_EXECUTABLE_PATH).trim()) ||
        (process.env.PUPPETEER_EXECUTABLE_PATH && String(process.env.PUPPETEER_EXECUTABLE_PATH).trim());
    if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
        console.log(`Using Chromium: ${chromiumPath}`);
        return chromiumPath;
    }
    return undefined;
}

async function applyPageLowMemoryOptimizations(page) {
    if (!isLowMemoryHost() || !page) return;
    try {
        if (typeof page.setCacheEnabled === 'function') await page.setCacheEnabled(false);
    } catch (_) {}
}

module.exports = {
    buildListecPuppeteerLaunchOptions,
    applyChromiumExecutablePathEnv,
    isLowMemoryHost,
    applyPageLowMemoryOptimizations
};
