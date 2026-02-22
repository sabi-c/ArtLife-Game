#!/usr/bin/env node
/**
 * Room Watcher — Dev-mode file watcher for Tiled auto-import.
 *
 * Watches tools/tiled/ for new/modified JSON files.
 * On change: fixes tileset paths → copies to public/content/maps/ → Vite HMR picks it up.
 *
 * Usage:
 *   npm run room:watch     (run alongside npm run dev)
 *
 * Workflow:
 *   1. Edit room in Tiled
 *   2. Save/Export JSON to tools/tiled/
 *   3. Watcher auto-copies to public/content/maps/ with fixed paths
 *   4. Vite HMR reloads the game
 */

import { watch, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATCH_DIR = join(__dirname, 'tiled');
const MAPS_DIR = join(__dirname, '..', 'public', 'content', 'maps');

// Ensure watch directory exists
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

// Debounce: ignore rapid successive events (Tiled saves trigger multiple fs events)
const debounceMap = {};
const DEBOUNCE_MS = 500;

function handleFileChange(eventType, filename) {
    if (!filename || !filename.endsWith('.json')) return;

    // Debounce
    const now = Date.now();
    if (debounceMap[filename] && now - debounceMap[filename] < DEBOUNCE_MS) return;
    debounceMap[filename] = now;

    const srcPath = join(WATCH_DIR, filename);
    const destPath = join(MAPS_DIR, filename);

    if (!existsSync(srcPath)) return; // File was deleted

    try {
        const raw = readFileSync(srcPath, 'utf-8');
        const json = JSON.parse(raw);

        // Fix tileset paths
        const fixed = fixTilesetPaths(json);

        // Write to public/content/maps/
        writeFileSync(destPath, JSON.stringify(fixed, null, 2));

        const now = new Date().toLocaleTimeString();
        const size = `${json.width}×${json.height}`;
        const objCount = json.layers?.find(l => l.type === 'objectgroup')?.objects?.length || 0;

        console.log(`  \x1b[32m✓\x1b[0m [${now}] ${filename} → public/content/maps/ (${size}, ${objCount} objects)`);
    } catch (e) {
        console.log(`  \x1b[31m✗\x1b[0m [${new Date().toLocaleTimeString()}] Error processing ${filename}: ${e.message}`);
    }
}

// ── Start watching ──

console.log(`\n\x1b[1m═══ Room Watcher ═══\x1b[0m`);
console.log(`  Watching: tools/tiled/*.json`);
console.log(`  Output:   public/content/maps/`);
console.log(`  \x1b[33mSave/export Tiled maps to tools/tiled/ — they'll auto-import.\x1b[0m`);
console.log(`  Press Ctrl+C to stop.\n`);

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
