#!/usr/bin/env node
/**
 * ArtLife Build Validator
 *
 * Runs before push to catch deployment-breaking issues:
 * 1. Vite build must succeed (catches missing imports like MasterCMS)
 * 2. All asset files referenced in source must be tracked in git
 * 3. All source files imported in code must exist
 *
 * Usage: node scripts/validate-build.cjs
 * Or: npm run validate
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GAME_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(GAME_DIR, 'src');
const PUBLIC_DIR = path.join(GAME_DIR, 'public');

let errors = [];
let warnings = [];

function log(msg) { console.log(`  ${msg}`); }
function pass(msg) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { errors.push(msg); console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { warnings.push(msg); console.log(`  \x1b[33m!\x1b[0m ${msg}`); }

console.log('\n\x1b[1m━━━ ArtLife Build Validator ━━━\x1b[0m\n');

// ── Step 1: Vite Build ──────────────────────────────────────────────────────
console.log('\x1b[1m[1/4] Vite Build\x1b[0m');
try {
    execSync('npx vite build', { cwd: GAME_DIR, stdio: 'pipe', timeout: 60000 });
    pass('Build succeeded');
} catch (err) {
    const stderr = err.stderr?.toString() || err.stdout?.toString() || '';
    // Extract the actual error line
    const errorMatch = stderr.match(/Could not resolve "([^"]+)" from "([^"]+)"/);
    if (errorMatch) {
        fail(`Missing import: "${errorMatch[1]}" imported by "${errorMatch[2]}"`);
    } else {
        fail(`Build failed: ${stderr.split('\n').slice(0, 3).join(' ')}`);
    }
}

// ── Step 2: Check all source imports resolve ────────────────────────────────
console.log('\x1b[1m[2/4] Import Resolution\x1b[0m');

function findImports(dir) {
    const imports = [];
    const files = [];

    function walk(d) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
        }
    }
    walk(dir);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        // Process line-by-line, skip comments
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
            // Match: import ... from './...' or import './...' or export ... from './...'
            const regex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
            let m;
            while ((m = regex.exec(line)) !== null) {
                imports.push({ from: file, importPath: m[1] });
            }
        }
    }
    return imports;
}

const allImports = findImports(SRC_DIR);
let missingImports = 0;

for (const { from, importPath } of allImports) {
    const dir = path.dirname(from);
    let resolved = path.resolve(dir, importPath);

    // Try exact match, then with extensions
    const candidates = [
        resolved,
        resolved + '.js',
        resolved + '.jsx',
        resolved + '.ts',
        resolved + '.tsx',
        path.join(resolved, 'index.js'),
        path.join(resolved, 'index.jsx'),
    ];

    const found = candidates.some(c => fs.existsSync(c));
    // Skip self-references (file importing itself via different path)
    const isSelf = candidates.some(c => {
        try { return fs.realpathSync(c) === fs.realpathSync(from); } catch { return false; }
    });
    if (!found && !isSelf) {
        const rel = path.relative(GAME_DIR, from);
        fail(`Import not found: "${importPath}" in ${rel}`);
        missingImports++;
    }
}

if (missingImports === 0) pass(`All ${allImports.length} local imports resolve`);

// ── Step 3: Check asset references exist ────────────────────────────────────
console.log('\x1b[1m[3/4] Asset References\x1b[0m');

// Find all asset path strings in source
function findAssetRefs(dir) {
    const refs = [];
    const files = [];

    function walk(d) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/\.(js|jsx)$/.test(entry.name)) files.push(full);
        }
    }
    walk(dir);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        // Match Phaser load patterns: this.load.image('key', 'path'), this.load.spritesheet('key', 'path', ...), this.load.tilemapTiledJSON('key', 'path')
        const regex = /this\.load\.(?:image|spritesheet|tilemapTiledJSON|audio|json|atlas|bitmapFont)\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            refs.push({ from: file, assetPath: m[1] });
        }
    }
    return refs;
}

const assetRefs = findAssetRefs(SRC_DIR);
let missingAssets = 0;
let gitTracked;
try {
    gitTracked = new Set(
        execSync('git ls-files', { cwd: GAME_DIR, encoding: 'utf-8' })
            .split('\n')
            .filter(Boolean)
    );
} catch (e) {
    gitTracked = null;
    warn('Could not read git tracked files');
}

for (const { from, assetPath } of assetRefs) {
    // Asset paths are relative to public/
    const fullPath = path.join(PUBLIC_DIR, assetPath);
    const gitPath = 'public/' + assetPath;

    if (!fs.existsSync(fullPath)) {
        const rel = path.relative(GAME_DIR, from);
        fail(`Asset file missing: "${assetPath}" referenced in ${rel}`);
        missingAssets++;
    } else if (gitTracked && !gitTracked.has(gitPath)) {
        const rel = path.relative(GAME_DIR, from);
        fail(`Asset not in git: "${gitPath}" referenced in ${rel} — will be missing on deploy!`);
        missingAssets++;
    }
}

if (missingAssets === 0) pass(`All ${assetRefs.length} asset references verified`);

// ── Step 4: Check git status for untracked source files ─────────────────────
console.log('\x1b[1m[4/4] Git Tracking\x1b[0m');

try {
    const untracked = execSync('git ls-files --others --exclude-standard -- src/', {
        cwd: GAME_DIR,
        encoding: 'utf-8',
    }).split('\n').filter(Boolean);

    if (untracked.length > 0) {
        for (const f of untracked) {
            warn(`Untracked source file: ${f} — won't be deployed`);
        }
    } else {
        pass('All source files are tracked in git');
    }
} catch (e) {
    warn('Could not check git tracking status');
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m━━━ Summary ━━━\x1b[0m');
if (errors.length > 0) {
    console.log(`\x1b[31m  ${errors.length} error(s) — DO NOT PUSH\x1b[0m`);
    for (const e of errors) console.log(`    - ${e}`);
    process.exit(1);
} else if (warnings.length > 0) {
    console.log(`\x1b[33m  ${warnings.length} warning(s) — review before pushing\x1b[0m`);
    console.log('\x1b[32m  Build is valid for deployment.\x1b[0m\n');
    process.exit(0);
} else {
    console.log('\x1b[32m  All checks passed — safe to push!\x1b[0m\n');
    process.exit(0);
}
