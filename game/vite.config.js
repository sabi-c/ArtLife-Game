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
                // Keep Phaser in its own chunk so tree-shaking doesn't break class hierarchy
                manualChunks: {
                    phaser: ['phaser'],
                },
            },
        },
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
