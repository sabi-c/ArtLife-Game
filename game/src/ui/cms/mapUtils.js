/**
 * mapUtils.js — Shared Tiled map utilities for CMS components
 *
 * Handles both flat data arrays and chunked infinite format.
 */

/**
 * Safely get flat tile data from a layer.
 * Handles: flat data arrays, chunked integer arrays, base64-encoded chunks (returns empty).
 * @param {Object} layer - Tiled layer object
 * @param {number} mapWidth - Map width in tiles
 * @param {number} mapHeight - Map height in tiles
 * @returns {number[]} Flat array of tile GIDs
 */
export function getLayerData(layer, mapWidth, mapHeight) {
    if (!layer) return [];
    if (layer.data && Array.isArray(layer.data)) return layer.data;
    if (layer.chunks) {
        // Base64-encoded chunks can't be decoded in CMS
        if (layer.chunks[0]?.data && typeof layer.chunks[0].data === 'string') return [];
        const flat = new Array(mapWidth * mapHeight).fill(0);
        for (const chunk of layer.chunks) {
            if (!Array.isArray(chunk.data)) continue;
            for (let row = 0; row < chunk.height; row++) {
                for (let col = 0; col < chunk.width; col++) {
                    const mx = chunk.x + col;
                    const my = chunk.y + row;
                    if (mx >= 0 && mx < mapWidth && my >= 0 && my < mapHeight) {
                        flat[my * mapWidth + mx] = chunk.data[row * chunk.width + col];
                    }
                }
            }
        }
        return flat;
    }
    return [];
}

/**
 * Check if a map uses infinite/encoded format that can't be edited in-browser.
 * @param {Object} mapJSON - Parsed Tiled map JSON
 * @returns {boolean}
 */
export function isInfiniteMap(mapJSON) {
    if (!mapJSON) return false;
    if (mapJSON.infinite) return true;
    const tileLayer = (mapJSON.layers || []).find(l => l.type === 'tilelayer');
    if (tileLayer?.chunks?.[0]?.data && typeof tileLayer.chunks[0].data === 'string') return true;
    return false;
}
