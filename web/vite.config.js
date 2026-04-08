import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo root (parent of /web) so PORT from root `.env` matches the proxy target. */
const repoRoot = path.join(__dirname, '..');

/** Same proxy for dev + preview so /api/* reaches Express. */
function buildApiProxy(env) {
    const port = String(env.PORT || env.VITE_API_PORT || '3101').trim() || '3101';
    const target = `http://127.0.0.1:${port}`;
    return {
        '/api': {
            target,
            changeOrigin: true,
            secure: false
        }
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, repoRoot, '');
    const apiProxy = buildApiProxy(env);

    return {
        plugins: [react()],
        server: {
            port: 5173,
            fs: {
                allow: ['..']
            },
            proxy: apiProxy
        },
        // `vite preview` does not inherit `server.proxy` unless set here — without it, /api/* returns 404.
        preview: {
            proxy: apiProxy
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true
        }
    };
});
