import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, createWriteStream } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

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
            name: 'configure-dev-server',
            configureServer: (server) => {
                server.middlewares.use((req, res, next) => {
                    // Image Upload Handler for CMS
                    if (req.url === '/api/upload-image' && req.method === 'POST') {
                        const filename = req.headers['x-filename'] || `upload_${Date.now()}.png`;
                        const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
                        const targetPath = path.resolve(__dirname, 'public/artworks', safeName);

                        const stream = createWriteStream(targetPath);
                        req.pipe(stream);

                        stream.on('finish', () => {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, filename: safeName }));
                        });

                        stream.on('error', (err) => {
                            console.error('Upload Error:', err);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ success: false, error: err.message }));
                        });
                        return;
                    }

                    // SPA History Fallback — serve index.html for all non-asset, non-API paths
                    // This enables URL-based routing (e.g. /admin, /market, /inbox)
                    if (req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.includes('.')) {
                        req.url = '/index.html';
                    }

                    // Existing headers
                    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                    next();
                });
            }
        }
    ]
});
