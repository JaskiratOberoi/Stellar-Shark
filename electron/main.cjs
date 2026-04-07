'use strict';

/**
 * Stellar Shark desktop shell: run the Express server in-process (same Node as Electron).
 * Fork + ELECTRON_RUN_AS_NODE was unreliable on Windows; env and web/dist paths must be set
 * before require('server/index.js') so UI routes mount correctly.
 */

const { app, BrowserWindow, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DEFAULT_PORT = Number(process.env.PORT || 3001);

let mainWindow = null;
/** @type {import('http').Server | null} */
let httpServer = null;
let serverPort = DEFAULT_PORT;

function getUserDataPath() {
    return app.getPath('userData');
}

function waitForHealth(port, maxMs = 60000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
                res.resume();
                if (res.statusCode === 200) {
                    resolve();
                    return;
                }
                retry();
            });
            req.on('error', () => retry());
            req.setTimeout(2000, () => {
                try {
                    req.destroy();
                } catch (_) {}
                retry();
            });
        };
        const retry = () => {
            if (Date.now() - start > maxMs) {
                reject(new Error(`Server did not respond on port ${port} within ${maxMs}ms`));
                return;
            }
            setTimeout(tryOnce, 400);
        };
        tryOnce();
    });
}

async function startBackendInProcess() {
    const appPath = app.getAppPath();
    const userData = getUserDataPath();
    const webDist = path.join(appPath, 'web', 'dist');
    const indexHtml = path.join(webDist, 'index.html');

    if (!fs.existsSync(indexHtml)) {
        throw new Error(
            `Built UI is missing (expected ${indexHtml}). Reinstall the app or rebuild with "npm run build" before packaging.`
        );
    }

    process.env.NODE_ENV = 'production';
    process.env.PORT = String(DEFAULT_PORT);
    process.env.STELLAR_SHARK_USER_DATA = userData;
    process.env.STELLAR_SHARK_DESKTOP = '1';
    process.env.STELLAR_SHARK_WEB_DIST = webDist;
    process.env.STELLAR_SHARK_BIND = '127.0.0.1';

    const serverEntry = path.join(appPath, 'server', 'index.js');
    delete require.cache[require.resolve(serverEntry)];
    const { startServer } = require(serverEntry);

    httpServer = await startServer();
    const addr = httpServer.address();
    serverPort = typeof addr === 'object' && addr && addr.port ? addr.port : DEFAULT_PORT;

    await waitForHealth(serverPort);
}

function stopBackend() {
    if (httpServer) {
        try {
            httpServer.close();
        } catch (_) {}
        httpServer = null;
    }
}

function getWindowIconPath() {
    const appPath = app.getAppPath();
    const candidates = [path.join(appPath, 'build', 'icon.png'), path.join(__dirname, '..', 'build', 'icon.png')];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return undefined;
}

function createWindow() {
    const icon = getWindowIconPath();
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 960,
        minHeight: 640,
        show: false,
        title: 'Stellar Shark',
        ...(icon ? { icon } : {}),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());

    mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`);

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
            await startBackendInProcess();
            createWindow();
        } catch (err) {
            console.error('[Stellar Shark] Failed to start', err);
            dialog.showErrorBox('Stellar Shark', `Could not start the application server:\n\n${err.message || err}`);
            app.quit();
        }
    });

    app.on('window-all-closed', () => {
        stopBackend();
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('before-quit', () => {
        stopBackend();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
