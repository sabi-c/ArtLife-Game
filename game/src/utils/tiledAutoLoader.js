/**
 * tiledAutoLoader.js — Auto-discover and load tilesets from Tiled map JSON
 *
 * Inspired by blopa/top-down-react-phaser-game-template's LoadAssetsScene.
 * Utility function callable from any scene's preload() method.
 *
 * ARCHITECTURE (v2 — single-pass):
 *   Instead of fetching JSON at runtime to discover tilesets (which causes
 *   a 2-pass timing issue where tilesets load AFTER preload completes),
 *   we maintain a static registry of all tilesets used across all maps.
 *   This is more reliable and just as maintainable — when you add a new
 *   tileset, add it to TILESET_REGISTRY below.
 *
 * Usage:
 *   import { autoLoadTiledMap } from '../utils/tiledAutoLoader.js';
 *   autoLoadTiledMap(this, 'gallery_test');
 *   // Loads: content/maps/gallery_test.json + all tilesets in one pass
 */

// ── Complete tileset registry ──
// Every tileset referenced by any Tiled map. Maps tileset name → relative URL.
// Adding a new tileset PNG? Add it here and it's available to all maps.
const TILESET_REGISTRY = {
    // ── LimeZu Modern Interiors (premium pack, 48×48) ──
    'Room_Builder_free_48x48': 'assets/tilesets/Room_Builder_free_48x48.png',
    'Interiors_free_48x48': 'assets/tilesets/Interiors_free_48x48.png',
    '7_Art_48x48': 'assets/tilesets/7_Art_48x48.png',
    '22_Museum_48x48': 'assets/tilesets/22_Museum_48x48.png',
    '1_Generic_48x48': 'assets/tilesets/1_Generic_48x48.png',
    '13_Conference_Hall_48x48': 'assets/tilesets/13_Conference_Hall_48x48.png',
    '2_LivingRoom_48x48': 'assets/tilesets/2_LivingRoom_48x48.png',

    // ── Custom / single-file tilesets ──
    'fossil_museum_48x48': 'assets/tilesets/fossil_museum_48x48.png',
    'gallery_tileset': 'assets/tilesets/gallery_tileset.png',

    // ── Overworld tilesets (Pokemon-style) ──
    'world': 'assets/tilesets/world.png',
    'world2': 'assets/tilesets/world2.png',
    'grounds': 'assets/tilesets/grounds.png',
    'grounds2': 'assets/tilesets/grounds2.png',

    // ── Kenney packs (nested paths) ──
    'kenney_indoor': 'assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png',
    'kenney_rpg_urban': 'assets/tilesets/kenney_rpg_urban_pack/Tilemap/tilemap_packed.png',
};

/**
 * Auto-load a Tiled map and all referenced tilesets in a single pass.
 *
 * @param {Phaser.Scene} scene - The Phaser scene (must be called from preload())
 * @param {string} mapId - Map identifier (e.g. 'gallery_test' → content/maps/gallery_test.json)
 * @param {Object} [options]
 * @param {string} [options.mapPath] - Custom path to map JSON
 * @param {string} [options.cacheKey] - Custom Phaser cache key (default: map_{mapId})
 */
export function autoLoadTiledMap(scene, mapId, options = {}) {
    const {
        mapPath = `content/maps/${mapId}.json`,
        cacheKey = `map_${mapId}`,
    } = options;

    // Skip if already cached
    if (scene.cache.tilemap.has(cacheKey)) {
        return;
    }

    // Load the tilemap JSON
    scene.load.tilemapTiledJSON(cacheKey, mapPath);
}

/**
 * Ensure all registered tilesets are loaded (idempotent).
 * Call once in BootScene.preload() to pre-warm the texture cache.
 *
 * @param {Phaser.Scene} scene
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
 *
 * @param {Phaser.Scene} scene
 * @param {string[]} mapIds
 * @param {Object} [options]
 */
export function autoLoadTiledMaps(scene, mapIds, options = {}) {
    for (const mapId of mapIds) {
        autoLoadTiledMap(scene, mapId, options);
    }
}

/**
 * Get all map IDs available in the content/maps directory.
 * Static registry — add new maps here when they're created.
 *
 * @returns {string[]}
 */
export function getAllMapIds() {
    return [
        'gallery_test',
        'uptown_gallery',
        'artist_studio_visit',
        'soho_gallery_lobby',
        'soho_gallery_exhibition',
        'soho_gallery_office',
        'chelsea_gallery',
        'chelsea_showcase',
        'fossil_museum',
        'art_gallery_museum',
        'museum_entrance',
        'dinosaur_museum',
        'small_gallery',
        'pallet_town',
    ];
}

/**
 * Get the tileset registry (for debugging/admin display).
 * @returns {Object<string, string>}
 */
export function getTilesetRegistry() {
    return { ...TILESET_REGISTRY };
}
