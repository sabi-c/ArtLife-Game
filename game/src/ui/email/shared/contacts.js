/**
 * contacts.js — Shared contact data and avatar utilities
 *
 * Used by inbox, haggle, and chat systems for consistent
 * avatar colors, contact formatting, and NPC display names.
 */

import { CONTACTS } from '../../../data/contacts.js';

// ════════════════════════════════════════════════════════════
// Avatar Color Palette
// ════════════════════════════════════════════════════════════

export const AVATAR_COLORS = [
    '#c44', '#1a73e8', '#f4b400', '#44aa66',
    '#7b1fa2', '#e67c00', '#00838f', '#c62828',
];

/**
 * Deterministic avatar background color from a name string.
 * @param {string} name
 * @returns {string} CSS color
 */
export function getAvatarColor(name) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/**
 * Get the first character of a name for avatar display.
 * @param {string} name
 * @returns {string} Single character
 */
export function getAvatarInitial(name) {
    return name?.charAt(0) || '?';
}

// ════════════════════════════════════════════════════════════
// Contact Formatting
// ════════════════════════════════════════════════════════════

/**
 * Format game contacts for autocomplete / suggestions.
 * @returns {Array<{name: string, email: string, role: string, avatar: string}>}
 */
export function getContactSuggestions() {
    try {
        return CONTACTS.map(c => ({
            name: c.name,
            email: `${c.id.replace(/_/g, '.')}@artworld.com`,
            role: c.title || c.role,
            avatar: c.emoji || c.name.charAt(0),
        }));
    } catch { return []; }
}
