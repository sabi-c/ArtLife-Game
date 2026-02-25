/**
 * tiledAutoLoader.js — Auto-discover and load tilesets from Tiled map JSON
 *
 * Currently simplified: the overworld (larus.json) is loaded directly by
 * NewWorldScene, and venue room maps have been removed. This module is
 * retained for future interior map loading when rooms are re-implemented.
 *
 * Usage:
 *   import { autoLoadTiledMap } from '../utils/tiledAutoLoader.js';
 *   autoLoadTiledMap(this, 'some_room');
 */

// ── Tileset registry ──
// Overworld tilesets are loaded directly by NewWorldScene.
// Future interior tilesets go here.
const TILESET_REGISTRY = {};

/**
 * Auto-load a Tiled map and all referenced tilesets in a single pass.
 */
export function autoLoadTiledMap(scene, mapId, options = {}) {
    const {
        mapPath = `content/maps/${mapId}.json`,
        cacheKey = `map_${mapId}`,
    } = options;

    if (scene.cache.tilemap.has(cacheKey)) return;
    scene.load.tilemapTiledJSON(cacheKey, mapPath);
}

/**
 * Ensure all registered tilesets are loaded (idempotent).
 */
export function preloadAllTilesets(scene) {
    for (const [name, path] of Object.entries(TILESET_REGISTRY)) {
        if (!scene.textures.exists(name)) {
            scene.load.image(name, path);
        }
    }
}

/**
 * Auto-load multiple Tiled maps.
 */
export function autoLoadTiledMaps(scene, mapIds, options = {}) {
    for (const mapId of mapIds) {
        autoLoadTiledMap(scene, mapId, options);
    }
}

/**
 * Get all map IDs. Currently empty — venue maps removed.
 * Add new room maps here when they're created.
 * @returns {string[]}
 */
export function getAllMapIds() {
    return [];
}

/**
 * Get the tileset registry (for debugging/admin display).
 * @returns {Object<string, string>}
 */
export function getTilesetRegistry() {
    return { ...TILESET_REGISTRY };
}
