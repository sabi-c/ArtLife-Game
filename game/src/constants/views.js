/**
 * views.js
 * 
 * Defines the mutually exclusive UI states for the main App.jsx router.
 * Only ONE of these views can be active at any given time, guaranteeing
 * that we don't accidentally stack TerminalLogin, Dashboard, and SceneEngine
 * on top of each other.
 */

export const VIEW = {
    BOOT: 'BOOT',                   // The TerminalLogin boot sequence
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
    CMS: 'CMS',
    DEBUG_LOG: 'DEBUG_LOG',
    // Legacy: STORYLINE_CMS and EVENT_CMS removed (superseded by MASTER_CMS)
    MASTER_CMS: 'MASTER_CMS',
    MARKET_DASHBOARD: 'MARKET_DASHBOARD',
    ARTWORK_DASHBOARD: 'ARTWORK_DASHBOARD',
    BLOOMBERG: 'BLOOMBERG',
    SALES_GRID: 'SALES_GRID',
    DESIGN_GUIDE: 'DESIGN_GUIDE',
};
