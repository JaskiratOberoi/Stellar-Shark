'use strict';

/**
 * Nexus by Stellar Infomatica — desktop shell: thin client; loads the deployed SPA from a configurable URL.
 * The API and PostgreSQL run in Docker (or another host); this process does not start Express.
 */

const { app, BrowserWindow, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

let mainWindow = null;

function getUserDataPath() {
    return app.getPath('userData');
}

function normalizeBackendUrl(raw) {
    let s = String(raw || '').trim();
    if (!s) throw new Error('Backend URL is empty');
    if (!/^https?:\/\//i.test(s)) {
        s = `https://${s}`;
    }
    if (!s.endsWith('/')) s += '/';
    return s;
}

function assertBackendUrlPolicy(urlStr) {
    let u;
    try {
        u = new URL(urlStr);
    } catch (e) {
        throw new Error(`Invalid backend URL: ${urlStr}`);
    }
    const host = u.hostname;
    const local = host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
    if (app.isPackaged && u.protocol !== 'https:' && !local) {
        throw new Error('Packaged app requires an HTTPS backend URL (http is allowed only for localhost).');
    }
}

function readConfigFileBackendUrl() {
    const cfgPath = path.join(getUserDataPath(), 'config.json');
    if (!fs.existsSync(cfgPath)) return null;
    try {
        const j = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (j && typeof j.backendUrl === 'string' && j.backendUrl.trim()) {
            return j.backendUrl.trim();
        }
    } catch (_) {}
    return null;
}

function resolveBackendUrl() {
    const fromEnv = process.env.NEXUS_DESKTOP_BACKEND_URL;
    if (fromEnv && String(fromEnv).trim()) {
        const u = normalizeBackendUrl(fromEnv);
        assertBackendUrlPolicy(u);
        return u;
    }
    const fromFile = readConfigFileBackendUrl();
    if (fromFile) {
        const u = normalizeBackendUrl(fromFile);
        assertBackendUrlPolicy(u);
        return u;
    }
    if (!app.isPackaged) {
        const u = normalizeBackendUrl('http://127.0.0.1:3101');
        assertBackendUrlPolicy(u);
        return u;
    }
    throw new Error(
        'Set the backend URL:\n' +
            '• Environment variable NEXUS_DESKTOP_BACKEND_URL, or\n' +
            `• File ${path.join(getUserDataPath(), 'config.json')} with {"backendUrl":"https://your-server/"}`
    );
}

function waitForHealth(baseOrigin, maxMs = 60000) {
    const healthUrl = new URL('api/health', baseOrigin).href;
    const u = new URL(healthUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const start = Date.now();

    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = lib.request(
                healthUrl,
                { method: 'GET', timeout: 8000 },
                (res) => {
                    res.resume();
                    if (res.statusCode === 200) {
                        resolve();
                        return;
                    }
                    retry();
                }
            );
            req.on('error', () => retry());
            req.on('timeout', () => {
                try {
                    req.destroy();
                } catch (_) {}
                retry();
            });
            req.end();
        };
        const retry = () => {
            if (Date.now() - start > maxMs) {
                reject(new Error(`Server did not respond at ${healthUrl} within ${maxMs}ms`));
                return;
            }
            setTimeout(tryOnce, 400);
        };
        tryOnce();
    });
}

function getWindowIconPath() {
    const appPath = app.getAppPath();
    const candidates = [path.join(appPath, 'build', 'icon.png'), path.join(__dirname, '..', 'build', 'icon.png')];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return undefined;
}

function createWindow(backendUrl) {
    const icon = getWindowIconPath();
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 960,
        minHeight: 640,
        show: false,
        title: 'Nexus · Stellar Infomatica',
        ...(icon ? { icon } : {}),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());

    mainWindow.loadURL(backendUrl);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        try {
            if (app.isPackaged && process.platform !== 'darwin') {
                Menu.setApplicationMenu(null);
            }
            const backendUrl = resolveBackendUrl();
            await waitForHealth(backendUrl);
            createWindow(backendUrl);
        } catch (err) {
            console.error('[Nexus] Failed to start', err);
            dialog.showErrorBox(
                'Nexus',
                `Cannot reach the application server:\n\n${err.message || err}\n\n` +
                    'Check NEXUS_DESKTOP_BACKEND_URL or config.json backendUrl.'
            );
            app.quit();
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            try {
                const backendUrl = resolveBackendUrl();
                waitForHealth(backendUrl)
                    .then(() => createWindow(backendUrl))
                    .catch((err) => {
                        dialog.showErrorBox('Nexus', err.message || String(err));
                    });
            } catch (err) {
                dialog.showErrorBox('Nexus', err.message || String(err));
            }
        }
    });
}
