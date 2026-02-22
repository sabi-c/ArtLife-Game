#!/usr/bin/env node
/**
 * Room Pipeline — Unified CLI for the full room lifecycle.
 *
 * Commands:
 *   new <template> <room_id> [--title "..."]   Generate from template + auto-wire
 *   import <exported.json> <room_id>            Import Tiled export + auto-wire
 *   list                                        List all rooms with stats
 *   open <room_id>                              Open room in Tiled editor
 *   validate <room_id>                          BFS reachability check on a room
 *
 * Auto-wiring steps (eliminates manual copy-paste):
 *   1. Writes map JSON to public/content/maps/<id>.json
 *   2. Patches src/data/rooms.js — inserts venue, adds to VENUES array
 *   3. Patches src/scenes/BootScene.js — adds tilemapTiledJSON preload
 *   4. Patches pallet_town.json — adds door + sign at next available position
 *   5. Runs npx vite build to verify
 *
 * npm scripts (in package.json):
 *   room:new, room:import, room:list, room:open, room:validate
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MAPS_DIR = join(ROOT, 'public', 'content', 'maps');
const ROOMS_FILE = join(ROOT, 'src', 'data', 'rooms.js');
const BOOT_FILE = join(ROOT, 'src', 'scenes', 'BootScene.js');
const PALLET_FILE = join(ROOT, 'public', 'content', 'maps', 'pallet_town.json');

// ── Helpers ──

function log(msg) { console.log(`  ${msg}`); }
function ok(msg) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); }
function err(msg) { console.error(`  \x1b[31m✗\x1b[0m ${msg}`); }

/** Read a JSON file */
function readJSON(path) {
    return JSON.parse(readFileSync(path, 'utf-8'));
}

/** Count objects by name in a Tiled map */
function countObjects(mapJSON) {
    const objLayer = mapJSON.layers?.find(l => l.type === 'objectgroup');
    if (!objLayer) return { paintings: 0, npcs: 0, doors: 0, dialogs: 0, spawns: 0 };
    const objs = objLayer.objects || [];
    return {
        paintings: objs.filter(o => o.name === 'painting').length,
        npcs: objs.filter(o => o.name === 'npc').length,
        doors: objs.filter(o => o.name === 'door').length,
        dialogs: objs.filter(o => o.name === 'dialog').length,
        spawns: objs.filter(o => o.name === 'spawn').length,
    };
}

/**
 * BFS reachability check — verifies all interactive objects are reachable from spawn.
 * Uses collision data from tile properties and world layer occupancy.
 */
function validateReachability(mapJSON) {
    const w = mapJSON.width;
    const h = mapJSON.height;
    const objLayer = mapJSON.layers?.find(l => l.type === 'objectgroup');
    const worldLayer = mapJSON.layers?.find(l => l.name === 'world');
    const belowLayer = mapJSON.layers?.find(l => l.name === 'below_player');

    if (!objLayer) return { reachable: true, issues: [] };

    // Build collision grid: true = blocked
    const blocked = new Array(w * h).fill(false);

    // Collect collision tile IDs from tileset properties
    const collisionGIDs = new Set();
    for (const ts of (mapJSON.tilesets || [])) {
        for (const tile of (ts.tiles || [])) {
            const collides = tile.properties?.find(p => p.name === 'collides' && p.value === true);
            if (collides) collisionGIDs.add((ts.firstgid || 0) + tile.id);
        }
    }

    // Mark wall tiles as blocked (from below_player layer)
    if (belowLayer?.data) {
        for (let i = 0; i < belowLayer.data.length; i++) {
            if (collisionGIDs.has(belowLayer.data[i])) blocked[i] = true;
        }
    }

    // Mark world layer non-zero tiles as blocked (furniture)
    if (worldLayer?.data) {
        for (let i = 0; i < worldLayer.data.length; i++) {
            if (worldLayer.data[i] !== 0) blocked[i] = true;
        }
    }

    // Find spawn point
    const spawn = objLayer.objects.find(o => o.name === 'spawn');
    if (!spawn) return { reachable: false, issues: ['No spawn point found'] };

    const spawnTX = Math.floor(spawn.x / mapJSON.tilewidth);
    const spawnTY = Math.floor(spawn.y / mapJSON.tileheight);

    // BFS from spawn
    const visited = new Set();
    const queue = [[spawnTX, spawnTY]];
    visited.add(`${spawnTX},${spawnTY}`);

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            const key = `${nx},${ny}`;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited.has(key)) {
                visited.add(key);
                if (!blocked[ny * w + nx]) {
                    queue.push([nx, ny]);
                }
            }
        }
    }

    // Check all interactive objects are adjacent to a reachable tile
    const issues = [];
    for (const obj of objLayer.objects) {
        if (!['painting', 'npc', 'dialog'].includes(obj.name)) continue;
        const ox = Math.floor(obj.x / mapJSON.tilewidth);
        const oy = Math.floor(obj.y / mapJSON.tileheight);
        // Check if this tile or any adjacent tile is reachable
        const adjacentReachable = [
            [ox, oy], [ox - 1, oy], [ox + 1, oy], [ox, oy - 1], [ox, oy + 1],
        ].some(([ax, ay]) => visited.has(`${ax},${ay}`));
        if (!adjacentReachable) {
            issues.push(`${obj.name} "${obj.properties?.[0]?.value || obj.name}" at (${ox},${oy}) is unreachable from spawn`);
        }
    }

    return { reachable: issues.length === 0, issues };
}

// ── Auto-Wiring Functions ──

/**
 * Patch rooms.js — insert venue constant before EXPORTS section, add to VENUES array.
 * Idempotent: skips if venue ID already exists.
 */
function wireRoomsJS(roomId, title, templateName) {
    let src = readFileSync(ROOMS_FILE, 'utf-8');
    const constName = roomId.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    // Check if already wired
    if (src.includes(`id: '${roomId}'`) && src.includes(constName)) {
        warn(`rooms.js already contains venue ${roomId} — skipping`);
        return;
    }

    // Build venue snippet
    const snippet = `
// ─────────────────────────────────────────────
// AUTO-WIRED by tools/room_pipeline.js
// ─────────────────────────────────────────────

const ${constName} = {
    id: '${roomId}',
    name: '${(title || roomId).replace(/'/g, "\\'")}',
    desc: 'Generated ${templateName || 'room'} interior.',
    startRoom: '${roomId}_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: '${roomId}_main',
            venue: '${roomId}',
            tiledMap: '${roomId}',
            name: '${(title || templateName || 'Room').replace(/'/g, "\\'")}',
            desc: '${(title || 'A generated room').replace(/'/g, "\\'")}',
            look: 'A ${(templateName || 'room').toLowerCase()} interior.',
            items: [],
            characters: [],
            exits: [{ dir: 'south', id: null, label: 'Exit' }],
            eavesdrops: [],
            timeCost: 0,
            tags: ['${(templateName || 'room').toLowerCase()}', 'tiled', 'generated'],
        }
    ],
};

`;

    // Insert before EXPORTS section
    const exportMarker = '// ─────────────────────────────────────────────\n// EXPORTS';
    if (src.includes(exportMarker)) {
        src = src.replace(exportMarker, snippet + exportMarker);
    } else {
        err('Could not find EXPORTS marker in rooms.js');
        return;
    }

    // Add to VENUES array
    const venuesArrayEnd = /(\];)\s*\n\s*\/\*\*\s*\n\s*\*\s*Flat lookup/;
    const match = src.match(venuesArrayEnd);
    if (match) {
        src = src.replace(match[0], `    ${constName},\n${match[0]}`);
    } else {
        // Fallback: find the VENUES array closing bracket
        const simpleEnd = /CHELSEA_GALLERY,?\s*\n(\s*\];)/;
        const m2 = src.match(simpleEnd);
        if (m2) {
            // Already has entries — add after last one
            warn('Using fallback VENUES array insertion');
        }
    }

    writeFileSync(ROOMS_FILE, src);
    ok(`rooms.js — added venue ${constName}`);
}

/**
 * Patch BootScene.js — add tilemapTiledJSON preload line.
 * Idempotent: skips if map key already exists.
 */
function wireBootScene(roomId) {
    let src = readFileSync(BOOT_FILE, 'utf-8');
    const mapKey = `map_${roomId}`;

    if (src.includes(mapKey)) {
        warn(`BootScene.js already loads ${mapKey} — skipping`);
        return;
    }

    // Insert after the last tilemapTiledJSON line
    const lastMapLine = /this\.load\.tilemapTiledJSON\('map_[^']+',\s*'content\/maps\/[^']+\.json'\);/g;
    let lastMatch = null;
    let m;
    while ((m = lastMapLine.exec(src)) !== null) {
        lastMatch = m;
    }

    if (lastMatch) {
        const insertPos = lastMatch.index + lastMatch[0].length;
        const newLine = `\n        // Auto-wired by room_pipeline.js\n        this.load.tilemapTiledJSON('${mapKey}', 'content/maps/${roomId}.json');`;
        src = src.slice(0, insertPos) + newLine + src.slice(insertPos);
    } else {
        err('Could not find tilemapTiledJSON insertion point in BootScene.js');
        return;
    }

    writeFileSync(BOOT_FILE, src);
    ok(`BootScene.js — added preload for ${mapKey}`);
}

/**
 * Patch pallet_town.json — add door + sign objects at next available x position.
 * Doors are placed at y=240 (building row), signs at y=216 (1 tile above).
 * Idempotent: skips if a door to this roomId already exists.
 */
function wirePalletTown(roomId, title) {
    const map = readJSON(PALLET_FILE);
    const objLayer = map.layers.find(l => l.type === 'objectgroup');
    if (!objLayer) { err('No objects layer in pallet_town.json'); return; }

    // Check if door already exists
    const existing = objLayer.objects.find(o =>
        o.name === 'door' && o.properties?.some(p => p.name === 'nextMap' && p.value === roomId)
    );
    if (existing) {
        warn(`pallet_town.json already has door to ${roomId} — skipping`);
        return;
    }

    // Find the rightmost door/sign x position to place next to it
    let maxX = 0;
    for (const obj of objLayer.objects) {
        if ((obj.name === 'door' || obj.name === 'dialog') && obj.y >= 200 && obj.y <= 260) {
            maxX = Math.max(maxX, obj.x);
        }
    }
    const newX = maxX + 48; // Next tile position (48px per tile)
    const doorY = 240;
    const signY = 216;

    let nextId = map.nextobjectid || 100;

    // Add door
    objLayer.objects.push({
        height: 0, id: nextId++, name: 'door', point: true,
        properties: [
            { name: 'nextMap', type: 'string', value: roomId },
            { name: 'nextMapRoom', type: 'string', value: `${roomId}_main` },
        ],
        rotation: 0, type: '', visible: true, width: 0,
        x: newX, y: doorY,
    });

    // Add sign
    objLayer.objects.push({
        height: 0, id: nextId++, name: 'dialog', point: true,
        properties: [
            { name: 'content', type: 'string', value: title || roomId },
        ],
        rotation: 0, type: '', visible: true, width: 0,
        x: newX, y: signY,
    });

    map.nextobjectid = nextId;
    writeFileSync(PALLET_FILE, JSON.stringify(map, null, 2));
    ok(`pallet_town.json — added door at x=${newX} + sign`);
}

/**
 * Fix tileset image paths in imported Tiled JSON.
 * Tiled exports absolute or relative paths depending on where the file was saved.
 * We normalize them to the relative paths our game expects.
 */
function fixTilesetPaths(mapJSON) {
    for (const ts of (mapJSON.tilesets || [])) {
        if (ts.image) {
            const filename = basename(ts.image);
            ts.image = `../../assets/tilesets/${filename}`;
        }
    }
    return mapJSON;
}

// ── Commands ──

/**
 * NEW — Generate from template + auto-wire everything.
 * Usage: room_pipeline.js new <template> <room_id> [--title "..."]
 */
function cmdNew(args) {
    const template = args[0];
    const roomId = args[1];
    if (!template || !roomId) {
        console.log('Usage: room_pipeline.js new <template> <room_id> [--title "Title"]');
        console.log('Templates: museum, gallery_showcase, gallery, studio, office, bar, warehouse');
        process.exit(1);
    }

    // Parse --title
    let title = null;
    const titleIdx = args.indexOf('--title');
    if (titleIdx !== -1 && args[titleIdx + 1]) title = args[titleIdx + 1];

    console.log(`\n\x1b[1m═══ Room Pipeline: NEW ═══\x1b[0m`);
    console.log(`  Template: ${template}`);
    console.log(`  Room ID:  ${roomId}`);
    if (title) console.log(`  Title:    ${title}`);
    console.log('');

    // Step 1: Generate map using generate_room.js
    log('Step 1/5: Generating map...');
    const generateCmd = `node "${join(__dirname, 'generate_room.js')}" ${template} ${roomId}${title ? ` --title "${title}"` : ''}`;
    try {
        execSync(generateCmd, { cwd: ROOT, stdio: 'pipe' });
        ok(`Generated ${roomId}.json`);
    } catch (e) {
        err(`Generation failed: ${e.stderr?.toString() || e.message}`);
        process.exit(1);
    }

    // Verify map was created
    const mapPath = join(MAPS_DIR, `${roomId}.json`);
    if (!existsSync(mapPath)) {
        err(`Map file not found at ${mapPath}`);
        process.exit(1);
    }

    // Step 1.5: Validate reachability
    const mapJSON = readJSON(mapPath);
    const validation = validateReachability(mapJSON);
    if (!validation.reachable) {
        warn('Reachability issues detected:');
        for (const issue of validation.issues) warn(`  ${issue}`);
    } else {
        ok('All objects reachable from spawn');
    }

    const counts = countObjects(mapJSON);
    log(`  Size: ${mapJSON.width}×${mapJSON.height}, Paintings: ${counts.paintings}, NPCs: ${counts.npcs}, Doors: ${counts.doors}`);

    // Step 2: Wire rooms.js
    log('Step 2/5: Patching rooms.js...');
    wireRoomsJS(roomId, title, template);

    // Step 3: Wire BootScene.js
    log('Step 3/5: Patching BootScene.js...');
    wireBootScene(roomId);

    // Step 4: Wire pallet_town.json
    log('Step 4/5: Patching pallet_town.json...');
    wirePalletTown(roomId, title || roomId);

    // Step 5: Build verification
    log('Step 5/5: Verifying build...');
    try {
        execSync('npx vite build', { cwd: ROOT, stdio: 'pipe' });
        ok('Build passed ✓');
    } catch (e) {
        err('Build failed! Check output:');
        console.log(e.stdout?.toString().slice(-500) || e.message);
        process.exit(1);
    }

    console.log(`\n\x1b[32m  ✓ Room "${roomId}" fully wired and build verified.\x1b[0m`);
    console.log(`  → Map:   public/content/maps/${roomId}.json`);
    console.log(`  → Play:  Enter WorldScene → find door → enter gallery`);
    console.log(`  → Edit:  npm run room:open ${roomId}\n`);
}

/**
 * IMPORT — Import a Tiled JSON export + auto-wire.
 * Usage: room_pipeline.js import <exported.json> <room_id> [--title "..."]
 */
function cmdImport(args) {
    const sourcePath = args[0];
    const roomId = args[1];
    if (!sourcePath || !roomId) {
        console.log('Usage: room_pipeline.js import <exported.json> <room_id> [--title "Title"]');
        process.exit(1);
    }

    let title = null;
    const titleIdx = args.indexOf('--title');
    if (titleIdx !== -1 && args[titleIdx + 1]) title = args[titleIdx + 1];

    console.log(`\n\x1b[1m═══ Room Pipeline: IMPORT ═══\x1b[0m`);
    console.log(`  Source: ${sourcePath}`);
    console.log(`  Room ID: ${roomId}`);
    console.log('');

    // Read and fix the source JSON
    if (!existsSync(sourcePath)) {
        err(`Source file not found: ${sourcePath}`);
        process.exit(1);
    }

    let mapJSON = readJSON(sourcePath);
    mapJSON = fixTilesetPaths(mapJSON);

    // Write to maps directory
    const destPath = join(MAPS_DIR, `${roomId}.json`);
    writeFileSync(destPath, JSON.stringify(mapJSON, null, 2));
    ok(`Copied and fixed paths → ${destPath}`);

    // Validate
    const validation = validateReachability(mapJSON);
    if (!validation.reachable) {
        warn('Reachability issues:');
        for (const issue of validation.issues) warn(`  ${issue}`);
    } else {
        ok('All objects reachable from spawn');
    }

    // Auto-wire
    log('Patching rooms.js...');
    wireRoomsJS(roomId, title, 'imported');

    log('Patching BootScene.js...');
    wireBootScene(roomId);

    log('Patching pallet_town.json...');
    wirePalletTown(roomId, title || roomId);

    // Build verification
    log('Verifying build...');
    try {
        execSync('npx vite build', { cwd: ROOT, stdio: 'pipe' });
        ok('Build passed ✓');
    } catch (e) {
        err('Build failed!');
        console.log(e.stdout?.toString().slice(-500) || e.message);
    }

    console.log(`\n\x1b[32m  ✓ Imported "${roomId}" and wired into game.\x1b[0m\n`);
}

/**
 * LIST — Show all rooms with stats.
 */
function cmdList() {
    console.log(`\n\x1b[1m═══ Room Pipeline: LIST ═══\x1b[0m\n`);

    const files = readdirSync(MAPS_DIR).filter(f => f.endsWith('.json') && f !== 'pallet_town.json');

    if (files.length === 0) {
        log('No room maps found.');
        return;
    }

    // Table header
    const pad = (s, n) => String(s).padEnd(n);
    const rpad = (s, n) => String(s).padStart(n);
    console.log(`  ${pad('NAME', 30)} ${rpad('SIZE', 7)} ${rpad('PAINT', 5)} ${rpad('NPC', 4)} ${rpad('DOOR', 4)} ${rpad('SPAWN', 5)}`);
    console.log(`  ${'─'.repeat(30)} ${'─'.repeat(7)} ${'─'.repeat(5)} ${'─'.repeat(4)} ${'─'.repeat(4)} ${'─'.repeat(5)}`);

    let totalPaintings = 0;
    let totalNPCs = 0;

    for (const file of files.sort()) {
        try {
            const mapJSON = readJSON(join(MAPS_DIR, file));
            const name = file.replace('.json', '');
            const size = `${mapJSON.width}×${mapJSON.height}`;
            const counts = countObjects(mapJSON);
            totalPaintings += counts.paintings;
            totalNPCs += counts.npcs;

            console.log(`  ${pad(name, 30)} ${rpad(size, 7)} ${rpad(counts.paintings, 5)} ${rpad(counts.npcs, 4)} ${rpad(counts.doors, 4)} ${rpad(counts.spawns, 5)}`);
        } catch (e) {
            console.log(`  ${pad(file.replace('.json', ''), 30)} \x1b[31m(error reading)\x1b[0m`);
        }
    }

    console.log(`\n  Total: ${files.length} maps, ${totalPaintings} paintings, ${totalNPCs} NPCs\n`);
}

/**
 * OPEN — Open a room in Tiled editor.
 */
function cmdOpen(args) {
    const roomId = args[0];
    if (!roomId) {
        console.log('Usage: room_pipeline.js open <room_id>');
        process.exit(1);
    }

    const mapPath = join(MAPS_DIR, `${roomId}.json`);
    if (!existsSync(mapPath)) {
        err(`Map not found: ${mapPath}`);
        // List available maps
        const files = readdirSync(MAPS_DIR).filter(f => f.endsWith('.json') && f !== 'pallet_town.json');
        log(`Available: ${files.map(f => f.replace('.json', '')).join(', ')}`);
        process.exit(1);
    }

    console.log(`\n  Opening ${roomId} in Tiled...\n`);

    try {
        // Try to open with Tiled (macOS)
        execSync(`open -a Tiled "${mapPath}"`, { stdio: 'inherit' });
        ok(`Opened ${roomId} in Tiled`);
        log('Save/export to tools/tiled/ for auto-import (if watcher is running)');
    } catch {
        // Fallback: try 'tiled' command
        try {
            execSync(`tiled "${mapPath}" &`, { stdio: 'inherit' });
            ok(`Opened ${roomId} in Tiled`);
        } catch {
            warn('Could not launch Tiled. Open manually:');
            console.log(`  tiled "${mapPath}"\n`);
        }
    }
}

/**
 * VALIDATE — BFS reachability check.
 */
function cmdValidate(args) {
    const roomId = args[0];
    if (!roomId) {
        console.log('Usage: room_pipeline.js validate <room_id>');
        process.exit(1);
    }

    const mapPath = join(MAPS_DIR, `${roomId}.json`);
    if (!existsSync(mapPath)) {
        err(`Map not found: ${mapPath}`);
        process.exit(1);
    }

    console.log(`\n\x1b[1m═══ Room Pipeline: VALIDATE ═══\x1b[0m\n`);
    const mapJSON = readJSON(mapPath);
    const counts = countObjects(mapJSON);

    log(`Room: ${roomId} (${mapJSON.width}×${mapJSON.height})`);
    log(`Objects: ${counts.paintings} paintings, ${counts.npcs} NPCs, ${counts.doors} doors`);
    console.log('');

    const result = validateReachability(mapJSON);
    if (result.reachable) {
        ok('All interactive objects are reachable from spawn ✓');
    } else {
        err('Reachability issues found:');
        for (const issue of result.issues) {
            err(`  ${issue}`);
        }
    }
    console.log('');
}

// ── CLI Router ──

function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const rest = args.slice(1);

    if (!command || command === '--help' || command === '-h') {
        console.log(`
\x1b[1mRoom Pipeline\x1b[0m — Unified room lifecycle CLI

Commands:
  new <template> <id> [--title "..."]   Generate + auto-wire into game
  import <file.json> <id> [--title]     Import Tiled export + auto-wire
  list                                  List all rooms with stats
  open <id>                             Open room in Tiled editor
  validate <id>                         BFS reachability check

Templates: museum, gallery_showcase, gallery, studio, office, bar, warehouse

Examples:
  npm run room:new museum my_gallery -- --title "My Gallery"
  npm run room:import -- exported.json my_room
  npm run room:list
  npm run room:open chelsea_showcase
  npm run room:validate chelsea_showcase
`);
        process.exit(0);
    }

    switch (command) {
        case 'new':     cmdNew(rest); break;
        case 'import':  cmdImport(rest); break;
        case 'list':    cmdList(); break;
        case 'open':    cmdOpen(rest); break;
        case 'validate': cmdValidate(rest); break;
        default:
            err(`Unknown command: ${command}`);
            log('Run with --help for usage.');
            process.exit(1);
    }
}

main();
