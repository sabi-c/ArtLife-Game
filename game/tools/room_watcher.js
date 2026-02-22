#!/usr/bin/env node
/**
 * Room Watcher — Dev-mode file watcher for Tiled auto-import.
 *
 * Watches tools/tiled/ for modified TMX and JSON files.
 * - TMX files: exported to JSON via `tiled --export-map`, then processed
 * - JSON files: tileset paths fixed, copied to public/content/maps/
 *
 * Usage:
 *   npm run room:watch     (run alongside npm run dev)
 *
 * Workflow:
 *   1. Open a room in Tiled: npm run room:edit chelsea_showcase --open
 *   2. Edit the room visually in Tiled
 *   3. Save the .tmx file (Cmd+S)
 *   4. Watcher auto-exports JSON → public/content/maps/
 *   5. Vite HMR reloads the game
 */

import { watch, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATCH_DIR = join(__dirname, 'tiled');
const MAPS_DIR = join(__dirname, '..', 'public', 'content', 'maps');

// Ensure directories exist
if (!existsSync(WATCH_DIR)) {
    mkdirSync(WATCH_DIR, { recursive: true });
    console.log(`  Created watch directory: tools/tiled/`);
}

/**
 * Fix tileset image paths in Tiled JSON exports.
 * Tiled saves absolute or export-relative paths — we normalize to game-relative.
 */
function fixTilesetPaths(json) {
    for (const ts of (json.tilesets || [])) {
        if (ts.image) {
            const filename = basename(ts.image);
            ts.image = `../../assets/tilesets/${filename}`;
        }
    }
    return json;
}

/**
 * Export a TMX file to JSON using Tiled's CLI, then process it.
 */
function handleTmxFile(filename) {
    const tmxPath = join(WATCH_DIR, filename);
    const roomId = filename.replace('.tmx', '');
    const jsonTmpPath = join(WATCH_DIR, `${roomId}.json`);
    const destPath = join(MAPS_DIR, `${roomId}.json`);

    // Skip template files
    if (filename === 'room_template.tmx') return;

    try {
        // Use Tiled CLI to export TMX → JSON
        execSync(`tiled --export-map "${tmxPath}" "${jsonTmpPath}"`, {
            stdio: 'pipe',
            timeout: 10000,
        });

        // Read exported JSON, fix paths, write to game maps
        const raw = readFileSync(jsonTmpPath, 'utf-8');
        const json = JSON.parse(raw);
        const fixed = fixTilesetPaths(json);

        // Remove editorsettings that Tiled adds
        delete fixed.editorsettings;

        writeFileSync(destPath, JSON.stringify(fixed, null, 2));

        const now = new Date().toLocaleTimeString();
        const size = `${json.width}×${json.height}`;
        const objLayer = json.layers?.find(l => l.type === 'objectgroup');
        const objCount = objLayer?.objects?.length || 0;

        console.log(`  \x1b[32m✓\x1b[0m [${now}] ${filename} → JSON → public/content/maps/${roomId}.json (${size}, ${objCount} objects)`);
    } catch (e) {
        const msg = e.stderr ? e.stderr.toString().trim() : e.message;
        console.log(`  \x1b[31m✗\x1b[0m [${new Date().toLocaleTimeString()}] Error exporting ${filename}: ${msg}`);
    }
}

/**
 * Process a JSON file — fix tileset paths and copy to game maps.
 */
function handleJsonFile(filename) {
    const srcPath = join(WATCH_DIR, filename);
    const destPath = join(MAPS_DIR, filename);

    try {
        const raw = readFileSync(srcPath, 'utf-8');
        const json = JSON.parse(raw);
        const fixed = fixTilesetPaths(json);
        delete fixed.editorsettings;
        writeFileSync(destPath, JSON.stringify(fixed, null, 2));

        const now = new Date().toLocaleTimeString();
        const size = `${json.width}×${json.height}`;
        const objCount = json.layers?.find(l => l.type === 'objectgroup')?.objects?.length || 0;

        console.log(`  \x1b[32m✓\x1b[0m [${now}] ${filename} → public/content/maps/ (${size}, ${objCount} objects)`);
    } catch (e) {
        console.log(`  \x1b[31m✗\x1b[0m [${new Date().toLocaleTimeString()}] Error processing ${filename}: ${e.message}`);
    }
}

// Debounce: ignore rapid successive events (Tiled saves trigger multiple fs events)
const debounceMap = {};
const DEBOUNCE_MS = 800;

function handleFileChange(eventType, filename) {
    if (!filename) return;

    const ext = extname(filename);
    if (ext !== '.tmx' && ext !== '.json') return;

    // Skip .tsx tileset definitions and project files
    if (filename.endsWith('.tsx') || filename.endsWith('.tiled-project')) return;

    // Debounce
    const now = Date.now();
    if (debounceMap[filename] && now - debounceMap[filename] < DEBOUNCE_MS) return;
    debounceMap[filename] = now;

    const srcPath = join(WATCH_DIR, filename);
    if (!existsSync(srcPath)) return; // File was deleted

    if (ext === '.tmx') {
        handleTmxFile(filename);
    } else if (ext === '.json') {
        handleJsonFile(filename);
    }
}

// ── Start watching ──

console.log(`\n\x1b[1m═══ ArtLife Room Watcher ═══\x1b[0m`);
console.log(`  Watching: tools/tiled/ (*.tmx and *.json)`);
console.log(`  Output:   public/content/maps/`);
console.log(`  Tiled CLI: ${(() => { try { return execSync('which tiled', { encoding: 'utf-8' }).trim(); } catch { return 'NOT FOUND — TMX export will fail'; } })()}`);
console.log('');
console.log(`  \x1b[36mWorkflow:\x1b[0m`);
console.log(`    1. Open:  npm run room:edit chelsea_showcase`);
console.log(`    2. Edit in Tiled, then Cmd+S to save`);
console.log(`    3. Watcher auto-exports → game auto-reloads`);
console.log(`  \x1b[33mPress Ctrl+C to stop.\x1b[0m\n`);

try {
    watch(WATCH_DIR, { recursive: false }, handleFileChange);
} catch (e) {
    console.error(`  Failed to start watcher: ${e.message}`);
    console.log(`  Make sure tools/tiled/ directory exists.`);
    process.exit(1);
}

// Keep process alive
process.on('SIGINT', () => {
    console.log('\n  Watcher stopped.');
    process.exit(0);
});
