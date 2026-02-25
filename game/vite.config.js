import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, createWriteStream } from 'fs';
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
        port: 5175,      // Fixed port for ArtLife dev server
        open: false      // Don't auto-open browser (Playwright handles this)
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/phaser')) return 'phaser';
                    if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'chart-vendor';
                    if (id.includes('/src/data/artworks') ||
                        id.includes('/src/data/dialogue_trees') ||
                        id.includes('/src/data/contacts') ||
                        id.includes('/src/data/rooms') ||
                        id.includes('/src/data/haggle_config') ||
                        id.includes('/src/data/events/')) return 'game-data';
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
        },
        // Auto-version service worker — stamps dist/sw.js with git hash after build
        // This ensures every deployment invalidates the old cache automatically
        {
            name: 'auto-version-sw',
            closeBundle() {
                try {
                    const swPath = path.resolve(__dirname, 'dist/sw.js');
                    let sw = readFileSync(swPath, 'utf-8');
                    sw = sw.replace(
                        /const CACHE_NAME = '[^']*'/,
                        `const CACHE_NAME = 'artlife-${gitHash}-${Date.now()}'`
                    );
                    writeFileSync(swPath, sw);
                    console.log(`\n  ✓ SW cache stamped: artlife-${gitHash}-${Date.now()}`);
                } catch (e) {
                    console.warn('  ⚠ Could not stamp sw.js:', e.message);
                }
            }
        }
    ]
});
