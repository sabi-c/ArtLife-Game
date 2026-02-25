/**
 * views.js
 * 
 * Defines the mutually exclusive UI states for the main App.jsx router,
 * overlay states, and Phaser scene keys. All routing constants in one file.
 */

export const VIEW = {
    SPLASH: 'SPLASH',               // Animated sprite boot splash
    NARRATIVE: 'NARRATIVE',         // Story text intro sequence
    ARTNET_HUB: 'ARTNET_HUB',     // Artnet Marketplace as main game hub
    BOOT: 'BOOT',                   // The ArtnetLogin boot/login screen
    BLOOMBERG: 'BLOOMBERG',         // Bloomberg Terminal as full-page view
    PHASER: 'PHASER',               // The raw game canvas (overworld, haggle, etc.)
    TERMINAL: 'TERMINAL',           // DOM terminal only (no React overlays, no canvas)
    DASHBOARD: 'DASHBOARD',         // The main Player Dashboard stats/ledger
    SCENE_ENGINE: 'SCENE_ENGINE',   // The text-based event visual novel engine
    CHARACTER_CREATOR: 'CHARACTER_CREATOR' // React-based character creation flow
};

/**
 * Defines the overlay states that can render ON TOP of active views.
 */
export const OVERLAY = {
    NONE: null,
    ADMIN: 'ADMIN',
    SETTINGS: 'SETTINGS',
    INVENTORY: 'INVENTORY',
    DEBUG_LOG: 'DEBUG_LOG',
    MASTER_CMS: 'MASTER_CMS',
    MARKET_DASHBOARD: 'MARKET_DASHBOARD',
    ARTWORK_DASHBOARD: 'ARTWORK_DASHBOARD',
    BLOOMBERG: 'BLOOMBERG',
    SALES_GRID: 'SALES_GRID',
    DESIGN_GUIDE: 'DESIGN_GUIDE',
    GMAIL_GUIDE: 'GMAIL_GUIDE',
    ARTNET_LOGIN: 'ARTNET_LOGIN',
    ARTNET_MARKETPLACE: 'ARTNET_MARKETPLACE',
    ARTNET_UI: 'ARTNET_UI',
};

/**
 * Phaser scene keys — use these instead of raw strings.
 * Re-exported from scene-keys.js for convenience.
 */
export { SCENE_KEYS as SCENE } from '../data/scene-keys.js';

