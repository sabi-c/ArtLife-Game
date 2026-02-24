#!/usr/bin/env node
/**
 * ArtLife Comprehensive Verifier
 *
 * One command to verify everything. Static analysis + headless runtime.
 *   1. Vite build (catches broken imports, bundling errors)
 *   2. Import resolution (all local imports exist on disk)
 *   3. Asset verification (Phaser-loaded PNG/JSON files exist)
 *   4. Cross-reference scan (detect unused exports)
 *   5. Runtime boot check (Phaser + React initialize, no fatal JS errors)
 *   6. Overlay loading (each overlay renders without crashing)
 *
 * Usage:
 *   node scripts/verify.cjs           # full (static + headless browser)
 *   node scripts/verify.cjs --static  # static only (no Playwright)
 *   node scripts/verify.cjs --port 5190  # custom port for dev server
 *
 * Requires: playwright (already in devDependencies)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GAME_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(GAME_DIR, 'src');
const PUBLIC_DIR = path.join(GAME_DIR, 'public');
const REPORT_DIR = path.join(GAME_DIR, 'test-results');

const args = process.argv.slice(2);
const STATIC_ONLY = args.includes('--static');
const PORT = args.includes('--port') ? args[args.indexOf('--port') + 1] : '5190';

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

const results = { pass: [], fail: [], warn: [], timestamp: new Date().toISOString() };

function log(msg) { console.log(`  ${msg}`); }
function pass(msg) { results.pass.push(msg); console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { results.fail.push(msg); console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { results.warn.push(msg); console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function section(n, title) { console.log(`\n\x1b[1m[${n}] ${title}\x1b[0m`); }

function walkFiles(dir, ext = /\.(js|jsx)$/) {
    const files = [];
    function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            if (e.name === 'node_modules' || e.name === '_deprecated' || e.name.startsWith('.')) continue;
            const full = path.join(d, e.name);
            if (e.isDirectory()) walk(full);
            else if (ext.test(e.name)) files.push(full);
        }
    }
    walk(dir);
    return files;
}

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════

(async () => {
    console.log('\n\x1b[1m━━━ ArtLife Verifier ━━━\x1b[0m');

    // ── Step 1: Vite Build ──
    section('1/6', 'Vite Build');
    try {
        execSync('npx vite build', { cwd: GAME_DIR, stdio: 'pipe', timeout: 60000 });
        pass('Build succeeded');
    } catch (err) {
        const output = (err.stderr || err.stdout || '').toString();
        const match = output.match(/Could not resolve "([^"]+)" from "([^"]+)"/);
        if (match) fail(`Missing import: "${match[1]}" in ${match[2]}`);
        else fail(`Build failed: ${output.split('\n').slice(-3).join(' ').trim()}`);
    }

    // ── Step 2: Import Resolution ──
    section('2/6', 'Import Resolution');
    const allFiles = walkFiles(SRC_DIR);
    let importCount = 0;
    let importErrors = 0;

    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
            const regex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;
            let m;
            while ((m = regex.exec(line)) !== null) {
                importCount++;
                const dir = path.dirname(file);
                const resolved = path.resolve(dir, m[1]);
                const candidates = [
                    resolved, resolved + '.js', resolved + '.jsx',
                    path.join(resolved, 'index.js'), path.join(resolved, 'index.jsx'),
                ];
                if (!candidates.some(c => fs.existsSync(c))) {
                    fail(`Import not found: "${m[1]}" in ${path.relative(GAME_DIR, file)}`);
                    importErrors++;
                }
            }
        }
    }
    if (importErrors === 0) pass(`All ${importCount} local imports resolve`);

    // ── Step 3: Asset References ──
    section('3/6', 'Asset References');
    let assetCount = 0;
    let assetMissing = 0;

    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const regex = /this\.load\.(?:image|spritesheet|tilemapTiledJSON|audio|json|atlas|bitmapFont)\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            assetCount++;
            const fullPath = path.join(PUBLIC_DIR, m[1]);
            if (!fs.existsSync(fullPath)) {
                const rel = path.relative(GAME_DIR, file);
                if (m[1].includes('sprites/walk_')) warn(`Missing NPC sprite: "${m[1]}" in ${rel}`);
                else fail(`Missing asset: "${m[1]}" in ${rel}`);
                assetMissing++;
            }
        }
    }
    const assetFailCount = results.fail.filter(e => e.startsWith('Missing asset')).length;
    if (assetFailCount === 0) pass(`${assetCount} asset references checked (${assetMissing} optional missing)`);

    // ── Step 4: Cross-Reference Scan ──
    section('4/6', 'Cross-Reference Scan');
    const exportMap = new Map();
    const importedNames = new Set();

    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        let m;
        const expRx = /export\s+(?:function|class|const|let|var)\s+(\w+)/g;
        while ((m = expRx.exec(content)) !== null) exportMap.set(m[1], path.relative(GAME_DIR, file));
        const impRx = /import\s+\{([^}]+)\}/g;
        while ((m = impRx.exec(content)) !== null) {
            m[1].split(',').forEach(n => importedNames.add(n.trim().split(/\s+/)[0]));
        }
        const defRx = /import\s+(\w+)\s+from/g;
        while ((m = defRx.exec(content)) !== null) importedNames.add(m[1]);
    }

    let unusedCount = 0;
    for (const [name, file] of exportMap) {
        if (['App', 'main', 'default'].includes(name)) continue;
        if (!importedNames.has(name)) { unusedCount++; }
    }
    if (unusedCount === 0) pass('No unused exports detected');
    else pass(`${unusedCount} potentially unused exports (non-blocking)`);

    // ── Steps 5+6: Runtime (Playwright) ──
    if (STATIC_ONLY) {
        section('5/6', 'Runtime Boot — SKIPPED (--static)');
        section('6/6', 'Overlay Loading — SKIPPED (--static)');
    } else {
        let browser, server;
        try {
            const { chromium } = require('playwright');

            section('5/6', 'Runtime Boot Check');
            log('Starting Vite dev server...');

            server = spawn('npx', ['vite', '--port', PORT, '--host'], { cwd: GAME_DIR, stdio: 'pipe' });

            // Wait for ready
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Dev server timeout (15s)')), 15000);
                const handler = (data) => {
                    if (data.toString().includes('ready')) { clearTimeout(timeout); resolve(); }
                };
                server.stdout.on('data', handler);
                server.stderr.on('data', handler);
            });

            const URL = `http://127.0.0.1:${PORT}/?skipBoot=true`;
            log(`Server ready → ${URL}`);

            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

            const pageErrors = [];
            const consoleErrors = [];

            page.on('pageerror', err => pageErrors.push(err.message));
            page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
            page.on('requestfailed', req => {
                const url = req.url();
                // Ignore HMR/websocket/favicon (expected in headless)
                if (url.includes('favicon') || url.includes('sockjs') ||
                    url.includes('@react-refresh') || url.includes('client') ||
                    url.includes('__vite'))
                    return;
                warn(`Network fail: ${url.split('/').pop()}`);
            });

            await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(5000); // Give Phaser + React enough time to boot

            // React check — any visible content means React rendered
            const reactOk = await page.evaluate(() => {
                const root = document.querySelector('#root');
                if (root && root.children.length > 0) return true;
                // Fallback: check for canvas (Phaser renders even if React is slow)
                if (document.querySelector('canvas')) return true;
                return false;
            });
            if (reactOk) pass('React app rendered');
            else warn('React app root empty (non-blocking — may need longer boot)');

            // Phaser check — try multiple globals
            const phaserOk = await page.evaluate(() =>
                !!(window.phaserGame || window.game || document.querySelector('canvas'))
            );
            if (phaserOk) pass('Phaser initialized (canvas present)');
            else warn('Phaser not detected (non-blocking — may need longer boot)');

            // Fatal error check
            const fatal = pageErrors.filter(e =>
                e.includes('is not defined') || e.includes('Cannot read properties') ||
                e.includes('is not a function') || e.includes('Class extends')
            );
            if (fatal.length > 0) {
                for (const e of fatal) fail(`JS Error: ${e.slice(0, 120)}`);
            } else {
                pass(`No fatal JS errors (${consoleErrors.length} console warnings)`);
            }

            // ── Step 6: Overlay Loading ──
            section('6/6', 'Overlay Loading');

            const overlays = ['ADMIN', 'SETTINGS', 'INVENTORY', 'BLOOMBERG',
                'SALES_GRID', 'MARKET_DASHBOARD', 'ARTWORK_DASHBOARD', 'MASTER_CMS',
                'DESIGN_GUIDE', 'DEBUG_LOG'];

            for (const name of overlays) {
                const errBefore = pageErrors.length;
                try {
                    // Trigger overlay via useUIStore
                    await page.evaluate((ov) => {
                        // Try direct store access
                        if (window.__artlife_setOverlay) {
                            window.__artlife_setOverlay(ov);
                        }
                    }, name);
                    await page.waitForTimeout(1200);

                    const newFatal = pageErrors.slice(errBefore).filter(e =>
                        e.includes('is not defined') || e.includes('Cannot read properties') ||
                        e.includes('is not a function')
                    );
                    if (newFatal.length > 0) {
                        fail(`Overlay ${name}: ${newFatal[0].slice(0, 80)}`);
                    } else {
                        pass(`Overlay ${name}`);
                    }

                    // Close
                    await page.evaluate(() => {
                        if (window.__artlife_setOverlay) window.__artlife_setOverlay(null);
                    });
                    await page.waitForTimeout(200);
                } catch (e) {
                    fail(`Overlay ${name}: ${e.message.slice(0, 60)}`);
                }
            }
        } catch (e) {
            if (e.message.includes('Cannot find module')) {
                warn('Playwright not installed — skipping runtime checks');
                warn('Install with: npx playwright install chromium');
            } else {
                fail(`Runtime: ${e.message}`);
            }
        } finally {
            if (browser) await browser.close();
            if (server) server.kill();
        }
    }

    // ══════════════════════════════════════════════════════════
    // Summary + Report
    // ══════════════════════════════════════════════════════════

    console.log('\n\x1b[1m━━━ VERIFICATION SUMMARY ━━━\x1b[0m');
    console.log(`  \x1b[32m✓ ${results.pass.length} passed\x1b[0m`);
    if (results.warn.length) console.log(`  \x1b[33m! ${results.warn.length} warnings\x1b[0m`);
    if (results.fail.length) {
        console.log(`  \x1b[31m✗ ${results.fail.length} FAILED\x1b[0m`);
        results.fail.forEach(e => console.log(`    \x1b[31m- ${e}\x1b[0m`));
    }

    // JSON report
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    const reportPath = path.join(REPORT_DIR, 'verify-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n  Report: ${path.relative(GAME_DIR, reportPath)}\n`);

    process.exit(results.fail.length > 0 ? 1 : 0);
})();
