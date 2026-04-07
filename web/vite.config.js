import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Same proxy for dev + preview so /api/* reaches Express on 3001. */
const apiProxy = {
    '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
    }
};

export default defineConfig({
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
});
