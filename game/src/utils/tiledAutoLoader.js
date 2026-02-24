/**
 * tiledAutoLoader.js — Auto-discover and load tilesets from Tiled map JSON
 *
 * Inspired by blopa/top-down-react-phaser-game-template's LoadAssetsScene.
 * Instead of a separate scene, this is a utility function that can be called
 * from any scene's preload() method.
 *
 * How it works:
 *   1. Fetches the Tiled JSON for a given map
 *   2. Extracts all tileset references (by name)
 *   3. Auto-loads any tileset images that aren't already cached
 *   4. Loads the tilemap JSON itself
 *
 * Usage:
 *   // In any scene's preload():
 *   import { autoLoadTiledMap } from '../utils/tiledAutoLoader.js';
 *   autoLoadTiledMap(this, 'gallery_test');
 *   // Loads: content/maps/gallery_test.json + all referenced tilesets
 *
 * Known tileset image locations:
 *   - assets/tilesets/{name}.png (flat tilesets)
 *   - assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png
 *   - Custom paths defined in TILESET_PATH_OVERRIDES
 */

// ── Tileset name → image path overrides ──
// Some tilesets have non-standard paths (nested folders, different filenames)
const TILESET_PATH_OVERRIDES = {
    'kenney_indoor': 'assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png',
    'kenney_rpg_urban': 'assets/tilesets/kenney_rpg_urban_pack/Tilemap/tilemap_packed.png',
};

/**
 * Auto-load a Tiled map and all its referenced tilesets.
 *
 * @param {Phaser.Scene} scene - The Phaser scene (must be called from preload())
 * @param {string} mapId - Map identifier (e.g. 'gallery_test' → content/maps/gallery_test.json)
 * @param {Object} [options] - Optional overrides
 * @param {string} [options.mapPath] - Custom path to map JSON (default: content/maps/{mapId}.json)
 * @param {string} [options.tilesetDir] - Custom tileset directory (default: assets/tilesets)
 * @param {string} [options.cacheKey] - Custom Phaser cache key (default: map_{mapId})
 */
export function autoLoadTiledMap(scene, mapId, options = {}) {
    const {
        mapPath = `content/maps/${mapId}.json`,
        tilesetDir = 'assets/tilesets',
        cacheKey = `map_${mapId}`,
    } = options;

    // Skip if already cached
    if (scene.cache.tilemap.has(cacheKey)) {
        return;
    }

    // Load the tilemap JSON
    scene.load.tilemapTiledJSON(cacheKey, mapPath);

    // Pre-fetch the JSON to discover tilesets
    // (Phaser doesn't expose tileset info until the map is created)
    scene.load.json(`_tilesetDiscovery_${mapId}`, mapPath);

    // After load completes, register discovered tilesets for next preload cycle
    scene.load.once('complete', () => {
        const mapData = scene.cache.json.get(`_tilesetDiscovery_${mapId}`);
        if (!mapData?.tilesets) return;

        for (const ts of mapData.tilesets) {
            const tsName = ts.name;
            if (!tsName) continue;

            // Skip if already loaded
            if (scene.textures.exists(tsName)) continue;

            // Resolve path
            const overridePath = TILESET_PATH_OVERRIDES[tsName];
            const imagePath = overridePath || `${tilesetDir}/${tsName}.png`;

            scene.load.image(tsName, imagePath);
        }

        // Start loading any newly registered tilesets
        if (!scene.load.isReady()) {
            scene.load.start();
        }

        // Cleanup discovery cache
        scene.cache.json.remove(`_tilesetDiscovery_${mapId}`);
    });
}

/**
 * Auto-load multiple Tiled maps.
 *
 * @param {Phaser.Scene} scene
 * @param {string[]} mapIds - Array of map identifiers
 * @param {Object} [options] - Shared options for all maps
 */
export function autoLoadTiledMaps(scene, mapIds, options = {}) {
    for (const mapId of mapIds) {
        autoLoadTiledMap(scene, mapId, options);
    }
}

/**
 * Get all map IDs available in the content/maps directory.
 * This is a static registry — add new maps here when they're created.
 *
 * @returns {string[]} Array of map identifiers
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
