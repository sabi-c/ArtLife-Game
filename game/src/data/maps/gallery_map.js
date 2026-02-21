/**
 * Gallery Interior Tilemap Data — Phase 40 Agent-3
 * 
 * Programmatic tilemap for the Chelsea Gallery interior.
 * 20 columns × 15 rows = 320×240 logical pixels at 16×16 per tile.
 * 
 * Used by OverworldScene via `this.make.tilemap({ data: GALLERY_FLOOR, tileWidth: 16, tileHeight: 16 })`
 * 
 * Tile indices reference the Kenney Roguelike Indoors spritesheet (tiles_indoor).
 * 
 * Legend:
 *   0 = empty/transparent
 *   Indoor tileset indices (approximate from the Kenney sheet):
 *     1  = dark wood floor
 *     2  = light wood floor  
 *     3  = stone floor
 *     10 = wall top
 *     11 = wall face
 *     12 = wall corner L
 *     13 = wall corner R
 *     20 = door
 *     30 = artwork frame
 *     31 = pedestal
 *     32 = reception desk
 *     33 = plant
 *     34 = bench
 */

// ─────────────────────────────────────────────
// FLOOR LAYER — ground tiles the player walks on
// ─────────────────────────────────────────────
// W = 20 tiles, H = 15 tiles
// Uses tile index 1 (dark wood) for main gallery, 2 (light wood) for entrance area
export const GALLERY_FLOOR = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// ─────────────────────────────────────────────
// WALL / COLLISION LAYER — 1 = solid, 0 = walkable
// ─────────────────────────────────────────────
export const GALLERY_WALLS = [
    [11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 13],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [11, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11],
    [12, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 13],
];

// ─────────────────────────────────────────────
// OBJECTS — interactive elements placed on top of the map
// ─────────────────────────────────────────────
// type: 'artwork' | 'npc' | 'furniture' | 'door' | 'exit'
export const GALLERY_OBJECTS = [
    // Artworks on walls (top wall)
    { x: 3, y: 0, type: 'artwork', id: 'painting_1', label: 'Large Abstract Canvas', tileId: 30 },
    { x: 7, y: 0, type: 'artwork', id: 'painting_2', label: 'Monochrome Series I', tileId: 30 },
    { x: 12, y: 0, type: 'artwork', id: 'painting_3', label: 'Neon Figure Study', tileId: 30 },
    { x: 16, y: 0, type: 'artwork', id: 'painting_4', label: 'Landscape (Oil, 2024)', tileId: 30 },

    // Artworks on left wall
    { x: 0, y: 4, type: 'artwork', id: 'painting_5', label: 'Mixed Media Installation', tileId: 30 },
    { x: 0, y: 8, type: 'artwork', id: 'painting_6', label: 'Charcoal Triptych', tileId: 30 },

    // Artworks on right wall
    { x: 19, y: 4, type: 'artwork', id: 'painting_7', label: 'Digital Print (Ed. 3/10)', tileId: 30 },
    { x: 19, y: 8, type: 'artwork', id: 'painting_8', label: 'Photography Grid', tileId: 30 },

    // Sculpture pedestals (center of gallery)
    { x: 5, y: 5, type: 'furniture', id: 'pedestal_1', label: 'Bronze Sculpture', tileId: 31, collidable: true },
    { x: 14, y: 5, type: 'furniture', id: 'pedestal_2', label: 'Ceramic Vessel', tileId: 31, collidable: true },
    { x: 9, y: 9, type: 'furniture', id: 'pedestal_3', label: 'Glass Installation', tileId: 31, collidable: true },

    // Reception desk (near entrance)
    { x: 3, y: 12, type: 'furniture', id: 'reception', label: 'Reception Desk', tileId: 32, collidable: true, width: 3 },

    // Furniture accents
    { x: 9, y: 4, type: 'furniture', id: 'bench_1', label: 'Gallery Bench', tileId: 34, collidable: true },
    { x: 1, y: 1, type: 'furniture', id: 'plant_1', label: 'Potted Fig', tileId: 33, collidable: true },
    { x: 18, y: 1, type: 'furniture', id: 'plant_2', label: 'Potted Palm', tileId: 33, collidable: true },
    { x: 1, y: 12, type: 'furniture', id: 'plant_3', label: 'Orchid', tileId: 33, collidable: true },
    { x: 18, y: 12, type: 'furniture', id: 'plant_4', label: 'Fern', tileId: 33, collidable: true },

    // NPCs
    { x: 4, y: 12, type: 'npc', id: 'elena_ross', label: 'Elena Ross', spriteKey: 'dealer_shark', facing: 'up' },
    { x: 10, y: 6, type: 'npc', id: 'margaux_villiers', label: 'Margaux Villiers', spriteKey: 'dealer_patron', facing: 'down' },
    { x: 15, y: 9, type: 'npc', id: 'collector_1', label: 'A Serious Buyer', spriteKey: 'dealer_collector', facing: 'left' },

    // Exits / Doors
    { x: 9, y: 14, type: 'exit', id: 'gallery_exit', label: 'Exit to Street', target: 'city_chelsea' },
];

// ─────────────────────────────────────────────
// MAP METADATA
// ─────────────────────────────────────────────
export const GALLERY_META = {
    id: 'chelsea_gallery_interior',
    name: 'Whitfield Gallery — Chelsea',
    tileWidth: 16,
    tileHeight: 16,
    mapWidth: 20,   // tiles
    mapHeight: 15,  // tiles
    playerSpawn: { x: 9, y: 12 },  // Entrance area
    ambientTint: 0xeeeeff,          // Cool gallery lighting
    ambientAlpha: 0.08,             // Very subtle
    tileset: 'tiles_indoor',        // Which preloaded spritesheet to use
};
