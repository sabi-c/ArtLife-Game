/**
 * assets.js — Asset path resolution utilities
 *
 * Provides base-path-aware URL resolution so artwork images (and other
 * public assets) work both on localhost AND GitHub Pages subpath deployments.
 *
 * Vite sets `import.meta.env.BASE_URL` from the `base` config in vite.config.js.
 * Locally this is `./`, on GitHub Pages it's also `./` (relative), which means
 * we need to resolve paths relative to the document rather than using
 * absolute `/artworks/...` paths that break on subpath deployments.
 *
 * @example
 *   import { resolveArtworkUrl } from '../utils/assets.js';
 *   <img src={resolveArtworkUrl(work)} />
 *   // Local:  "./artworks/basquiat_skull.jpg"
 *   // GH Pages: "./artworks/basquiat_skull.jpg" (relative to index.html)
 */

/** Vite base URL — guaranteed to end with '/' */
const BASE = import.meta.env.BASE_URL || './';

/**
 * Resolve an artwork image URL from a work object.
 * Handles all sprite field formats:
 *   - Full URL: "https://..." → returned as-is
 *   - Already prefixed: "/artworks/foo.jpg" → strips leading / and prepends BASE
 *   - Bare filename: "foo.jpg" → prepends BASE + "artworks/"
 *
 * @param {Object} work — artwork object with imageUrl, image, or sprite field
 * @returns {string|null} resolved URL or null if no image data
 */
export function resolveArtworkUrl(work) {
    const raw = work?.imageUrl || work?.image || work?.sprite;
    if (!raw) return null;
    // External URLs — pass through
    if (raw.startsWith('http')) return raw;
    // Strip leading slash if present, then build relative path
    const clean = raw.replace(/^\/+/, '');
    // If it already starts with "artworks/", just prepend base
    if (clean.startsWith('artworks/')) return `${BASE}${clean}`;
    // Bare filename — add artworks/ prefix
    return `${BASE}artworks/${clean}`;
}

/**
 * Resolve any public asset path relative to the Vite base.
 * Use for non-artwork assets that live in public/.
 *
 * @param {string} publicPath — e.g. "sprites/player.png" or "/content/maps/map.json"
 * @returns {string} base-relative URL
 */
export function resolvePublicUrl(publicPath) {
    if (!publicPath) return '';
    if (publicPath.startsWith('http')) return publicPath;
    const clean = publicPath.replace(/^\/+/, '');
    return `${BASE}${clean}`;
}
