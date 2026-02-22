#!/usr/bin/env node
/**
 * json_to_tmx.js — Convert a game map JSON back to Tiled TMX format
 *
 * This allows opening generated/imported maps in Tiled for visual editing.
 * The TMX references .tsx tileset files in tools/tiled/ so Tiled can display
 * all tiles correctly.
 *
 * Usage:
 *   node tools/json_to_tmx.js <map_id>
 *   node tools/json_to_tmx.js chelsea_showcase
 *
 * Reads:  public/content/maps/<map_id>.json
 * Writes: tools/tiled/<map_id>.tmx
 * Opens:  Tiled with the new .tmx file (optional --open flag)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '..');
const MAPS_DIR = path.join(GAME_ROOT, 'public/content/maps');
const TILED_DIR = path.join(GAME_ROOT, 'tools/tiled');

const args = process.argv.slice(2);
const shouldOpen = args.includes('--open');
const mapId = args.find(a => !a.startsWith('--'));

if (!mapId) {
    console.error('Usage: node tools/json_to_tmx.js <map_id> [--open]');
    console.error('Example: node tools/json_to_tmx.js chelsea_showcase --open');
    console.error('');
    console.error('Available maps:');
    const maps = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.json'));
    maps.forEach(m => console.error(`  ${m.replace('.json', '')}`));
    process.exit(1);
}

const inputPath = path.join(MAPS_DIR, `${mapId}.json`);
if (!fs.existsSync(inputPath)) {
    console.error(`Map not found: ${inputPath}`);
    process.exit(1);
}

const map = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// --- Build TMX XML ---

/** Escape XML special characters */
function escXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Compute nextlayerid and nextobjectid from existing data
const allLayerIds = map.layers.map(l => l.id || 0);
const nextLayerId = map.nextlayerid || Math.max(...allLayerIds) + 1;

const allObjectIds = map.layers
    .filter(l => l.type === 'objectgroup')
    .flatMap(l => (l.objects || []).map(o => o.id || 0));
const nextObjectId = map.nextobjectid || (allObjectIds.length ? Math.max(...allObjectIds) + 1 : 1);

let tmx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
tmx += `<map version="1.10" tiledversion="1.11.2" orientation="${map.orientation || 'orthogonal'}" renderorder="${map.renderorder || 'right-down'}" width="${map.width}" height="${map.height}" tilewidth="${map.tilewidth}" tileheight="${map.tileheight}" infinite="0" nextlayerid="${nextLayerId}" nextobjectid="${nextObjectId}">\n`;

// Tileset references — use external .tsx files so Tiled loads the images
for (const ts of map.tilesets) {
    const firstgid = ts.firstgid;
    // Map tileset name to .tsx file
    let tsxFile;
    if (ts.name && ts.name.includes('Room_Builder')) {
        tsxFile = 'Room_Builder_free_48x48.tsx';
    } else if (ts.name && ts.name.includes('Interiors')) {
        tsxFile = 'Interiors_free_48x48.tsx';
    } else if (ts.name && ts.name.includes('fossil_museum')) {
        tsxFile = 'fossil_museum_48x48.tsx';
    } else {
        // Fallback: try to match by firstgid or derive from image filename
        if (ts.image) {
            const imgBase = path.basename(ts.image, '.png');
            tsxFile = `${imgBase}.tsx`;
        } else {
            tsxFile = firstgid === 1 ? 'Room_Builder_free_48x48.tsx' : 'Interiors_free_48x48.tsx';
        }
    }
    tmx += ` <tileset firstgid="${firstgid}" source="${tsxFile}"/>\n`;
}

// Tile layers
for (const layer of map.layers) {
    if (layer.type === 'tilelayer') {
        tmx += ` <layer id="${layer.id}" name="${escXml(layer.name)}" width="${layer.width || map.width}" height="${layer.height || map.height}">\n`;
        tmx += `  <data encoding="csv">\n`;

        // Format tile data as CSV rows (width tiles per row)
        const w = layer.width || map.width;
        const data = layer.data;
        const rows = [];
        for (let y = 0; y < (layer.height || map.height); y++) {
            const row = data.slice(y * w, (y + 1) * w);
            rows.push(row.join(','));
        }
        // Last row has no trailing comma, others do
        tmx += rows.join(',\n') + '\n';
        tmx += `</data>\n`;
        tmx += ` </layer>\n`;
    } else if (layer.type === 'objectgroup') {
        tmx += ` <objectgroup id="${layer.id}" name="${escXml(layer.name)}">\n`;

        for (const obj of (layer.objects || [])) {
            // Build properties XML
            let propsXml = '';
            if (obj.properties && obj.properties.length > 0) {
                propsXml = '   <properties>\n';
                for (const p of obj.properties) {
                    const pType = p.type || 'string';
                    const pValue = p.value;
                    propsXml += `    <property name="${escXml(p.name)}" `;
                    if (pType !== 'string') {
                        propsXml += `type="${pType}" `;
                    }
                    propsXml += `value="${escXml(pValue)}"/>\n`;
                }
                propsXml += '   </properties>\n';
            }

            // Point objects (spawn, door, painting, npc, dialog)
            if (obj.point) {
                tmx += `  <object id="${obj.id}" name="${escXml(obj.name)}" x="${obj.x}" y="${obj.y}">\n`;
                if (propsXml) tmx += propsXml;
                tmx += `   <point/>\n`;
                tmx += `  </object>\n`;
            } else {
                // Rectangle or other shapes
                const w = obj.width || 0;
                const h = obj.height || 0;
                tmx += `  <object id="${obj.id}" name="${escXml(obj.name)}" x="${obj.x}" y="${obj.y}" width="${w}" height="${h}">\n`;
                if (propsXml) tmx += propsXml;
                tmx += `  </object>\n`;
            }
        }

        tmx += ` </objectgroup>\n`;
    }
}

tmx += `</map>\n`;

// Write TMX file
const outputPath = path.join(TILED_DIR, `${mapId}.tmx`);
fs.writeFileSync(outputPath, tmx);
console.log(`✅ TMX file created: tools/tiled/${mapId}.tmx`);
console.log(`   Size: ${map.width}×${map.height} tiles`);
console.log(`   Layers: ${map.layers.map(l => l.name).join(', ')}`);

// Count objects
const objLayer = map.layers.find(l => l.type === 'objectgroup');
const objects = objLayer?.objects || [];
console.log(`   Objects: ${objects.length} (${objects.filter(o => o.name === 'painting').length} paintings, ${objects.filter(o => o.name === 'npc').length} NPCs)`);
console.log('');

if (shouldOpen) {
    console.log('Opening in Tiled...');
    try {
        execSync(`open "${outputPath}"`, { stdio: 'inherit' });
    } catch (e) {
        console.log(`Could not auto-open. Open manually:\n  tiled "${outputPath}"`);
    }
} else {
    console.log('To open in Tiled:');
    console.log(`  tiled "tools/tiled/${mapId}.tmx"`);
    console.log('  — or —');
    console.log(`  npm run room:edit ${mapId}`);
}
