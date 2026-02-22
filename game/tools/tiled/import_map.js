#!/usr/bin/env node
/**
 * import_map.js — Import a Tiled JSON export into the game
 *
 * Usage:
 *   node tools/tiled/import_map.js <tiled_export.json> <room_id>
 *
 * What it does:
 *   1. Reads the Tiled JSON export
 *   2. Fixes tileset image paths to be relative (for GitHub Pages)
 *   3. Copies to public/content/maps/<room_id>.json
 *   4. Prints the rooms.js snippet and BootScene preload line
 *
 * Workflow:
 *   1. Open tools/tiled/room_template.tmx in Tiled
 *   2. Design your room visually
 *   3. File > Export As > JSON (.json)
 *   4. Run: node tools/tiled/import_map.js exported_file.json my_gallery
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '../..');
const MAPS_DIR = path.join(GAME_ROOT, 'public/content/maps');

const [,, inputFile, roomId] = process.argv;

if (!inputFile || !roomId) {
    console.error('Usage: node tools/tiled/import_map.js <tiled_export.json> <room_id>');
    console.error('Example: node tools/tiled/import_map.js my_gallery.json my_gallery');
    process.exit(1);
}

// Read the Tiled JSON export
const raw = fs.readFileSync(inputFile, 'utf-8');
const map = JSON.parse(raw);

// Fix tileset image paths — make them relative filenames only
// Tiled exports full paths like "../../public/assets/tilesets/Room_Builder_free_48x48.png"
// We need just the filename since LocationScene resolves tilesets by name
for (const ts of map.tilesets) {
    if (ts.image) {
        ts.image = path.basename(ts.image);
    }
}

// Remove Tiled editor settings (not needed at runtime)
delete map.editorsettings;

// Write to maps directory
const outputPath = path.join(MAPS_DIR, `${roomId}.json`);
fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));
console.log(`✅ Map saved to: public/content/maps/${roomId}.json`);

// Count objects
const objLayer = map.layers?.find(l => l.type === 'objectgroup');
const objects = objLayer?.objects || [];
const paintings = objects.filter(o => o.name === 'painting' || o.type === 'painting');
const npcs = objects.filter(o => o.name === 'npc' || o.type === 'npc');
const doors = objects.filter(o => o.name === 'door' || o.type === 'door');

console.log(`   Size: ${map.width}×${map.height} tiles (${map.width * map.tilewidth}×${map.height * map.tileheight}px)`);
console.log(`   Objects: ${paintings.length} paintings, ${npcs.length} NPCs, ${doors.length} doors`);
console.log('');

// Print rooms.js snippet
console.log('── Add to src/data/rooms.js ──');
console.log(`
const ${roomId.toUpperCase().replace(/-/g, '_')} = {
    id: '${roomId}',
    name: '${roomId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}',
    desc: 'A gallery interior.',
    startRoom: '${roomId}_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [{
        id: '${roomId}_main',
        venue: '${roomId}',
        tiledMap: '${roomId}',
        name: 'Main Room',
        desc: 'TODO: Add description.',
        look: 'TODO: Add look text.',
        items: [],
        characters: [],
        exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
        eavesdrops: [],
        timeCost: 0,
        tags: ['gallery', 'tiled'],
    }],
};
`);
console.log(`// Add to VENUES array: ${roomId.toUpperCase().replace(/-/g, '_')},`);
console.log('');

// Print BootScene preload line
console.log('── Add to src/scenes/BootScene.js preload() ──');
console.log(`this.load.tilemapTiledJSON('map_${roomId}', 'content/maps/${roomId}.json');`);
console.log('');

// Print pallet_town.json door snippet (for WorldScene)
console.log('── Add door object to pallet_town.json objects layer ──');
console.log(JSON.stringify({
    height: 0,
    id: '???',
    name: 'door',
    point: true,
    properties: [
        { name: 'nextMap', type: 'string', value: roomId },
        { name: 'nextMapRoom', type: 'string', value: `${roomId}_main` },
        { name: 'label', type: 'string', value: roomId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    ],
    rotation: 0,
    type: '',
    visible: true,
    width: 0,
    x: '???',
    y: 240,
}, null, 2));
