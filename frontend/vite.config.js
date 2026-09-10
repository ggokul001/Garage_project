import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'node:path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), ''), backendEnv = loadEnv(mode, path.resolve(process.cwd(), '../backend'), ''), proxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:".concat(backendEnv.PORT || 4010);
    return {
        base: env.VITE_BASE_PATH || '/',
        plugins: [
            react(),
            legacy({
                targets: ['iOS >= 12', 'Safari >= 12'],
                modernPolyfills: true,
                additionalLegacyPolyfills: ['core-js/modules/web.queue-microtask.js'],
                additionalModernPolyfills: ['core-js/modules/web.queue-microtask.js'],
            }),
        ],
        server: { port: 5174, proxy: { '/api': { target: proxyTarget, changeOrigin: true } } },
    };
});
