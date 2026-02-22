import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Inject version info at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
let gitHash = 'dev';
try { gitHash = execSync('git rev-parse --short HEAD').toString().trim(); } catch (e) { /* no git */ }
const buildTime = new Date().toISOString();

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
    define: {
        '__APP_VERSION__': JSON.stringify(pkg.version),
        '__GIT_HASH__': JSON.stringify(gitHash),
        '__BUILD_TIME__': JSON.stringify(buildTime),
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
