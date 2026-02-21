import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: './', // Use relative paths for built assets
    server: {
        host: '0.0.0.0', // Listen on all network interfaces
        port: 5173,      // Default Vite port
        open: false      // Don't auto-open browser (Playwright handles this)
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser'],
                },
            },
        },
    },
    // Prevent Vite from pre-bundling inkjs (internal circular deps break the build)
    optimizeDeps: {
        exclude: ['inkjs'],
    },
    plugins: [
        react(),
        {
            name: 'configure-response-headers',
            configureServer: (server) => {
                server.middlewares.use((_req, res, next) => {
                    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                    next();
                });
            }
        }
    ]
});
