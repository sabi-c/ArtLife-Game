/**
 * src/utils/math.js
 * Shared math utilities used across the ArtLife codebase.
 *
 * Replaces scattered Math.max(min, Math.min(max, value)) patterns
 * with a single, readable clamp function.
 */

/**
 * Clamp a numeric value between min and max (inclusive).
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
