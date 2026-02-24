/**
 * MarketConfig.js — Centralized Market Simulation Configuration
 *
 * ALL tunable market simulation parameters live here. This is the single
 * control panel for anyone wanting to adjust how the art market behaves.
 *
 * USAGE:
 *   import { MarketConfig } from './MarketConfig.js';
 *   const drift = MarketConfig.get('tiers.hot.annualDrift'); // 0.18
 *   MarketConfig.set('seasonalOverrides.july.pricePremium', 0.10);
 *
 * ARCHITECTURE:
 *   MarketConfig provides defaults here → SettingsManager persists overrides
 *   → MarketHistoryEngine reads from MarketConfig at generation time
 *   → MarketManager reads from MarketConfig during weekly ticks
 *
 * CONFIGURATION CATEGORIES:
 *   1. Tier Parameters — drift, volatility, reversion per artist tier
 *   2. Seasonal Calendar — auction events, quiet periods, custom month boosts
 *   3. Macro Events — recession/bubble/scandal probabilities and impacts
 *   4. Simulation — years of history, trade frequency, correlation settings
 *   5. Custom Overrides — per-artist adjustments, month-specific price boosts
 */

import { SettingsManager } from './SettingsManager.js';

// ════════════════════════════════════════════════════
// Default Configuration
// ════════════════════════════════════════════════════

const DEFAULTS = {

    // ── 1. Tier Parameters ──────────────────────────
    // Each tier has calibrated financial parameters.
    // annualDrift = expected yearly return (CAGR)
    // volatility  = yearly standard deviation of returns
    // theta       = mean-reversion speed (higher = faster snap-back)
    // correlationRho = intra-tier correlation (0=independent, 1=lockstep)
    tiers: {
        'blue-chip': {
            annualDrift: 0.04,      // +4% CAGR (stable, reliable growth)
            volatility: 0.08,       // Low — blue chips don't swing much
            theta: 0.15,            // Moderate reversion
            correlationRho: 0.50,   // Strong — blue chips move together
            heatFloor: 65,
            heatCeiling: 98,
        },
        'hot': {
            annualDrift: 0.18,      // +18% CAGR (rapid appreciation)
            volatility: 0.25,       // High — hot artists can crash
            theta: 0.10,            // Slow — can overshoot for a while
            correlationRho: 0.35,
            heatFloor: 45,
            heatCeiling: 100,
        },
        'mid-career': {
            annualDrift: 0.03,      // +3% CAGR (modest, steady)
            volatility: 0.12,       // Moderate
            theta: 0.20,            // Moderate reversion
            correlationRho: 0.40,
            heatFloor: 30,
            heatCeiling: 85,
        },
        'emerging': {
            annualDrift: 0.08,      // +8% but huge variance
            volatility: 0.35,       // Very high
            theta: 0.05,            // Very slow — wild swings persist
            correlationRho: 0.25,
            heatFloor: 5,
            heatCeiling: 90,
        },
        'speculative': {
            annualDrift: -0.05,     // Often negative (most fail)
            volatility: 0.50,       // Extreme
            theta: 0.03,
            correlationRho: 0.15,
            heatFloor: 0,
            heatCeiling: 70,
        },
    },

    // ── 2. Seasonal Calendar ────────────────────────
    // These are the standard art world auction seasons.
    // volumeMult = trading volume multiplier during this period
    // pricePremium = price boost (e.g. 0.05 = +5%)
    // emergingBoost/blueChipBoost = extra heat added to those tiers
    auctionSeasons: [
        { startWeek: 10, endWeek: 12, name: 'Spring Auctions NYC', volumeMult: 1.4, pricePremium: 0.05 },
        { startWeek: 20, endWeek: 22, name: 'Art Basel', volumeMult: 1.5, pricePremium: 0.08, emergingBoost: 15 },
        { startWeek: 36, endWeek: 38, name: 'Frieze London', volumeMult: 1.3, pricePremium: 0.04 },
        { startWeek: 44, endWeek: 48, name: 'Fall Auctions NYC/London', volumeMult: 1.6, pricePremium: 0.07, blueChipBoost: 10 },
        { startWeek: 49, endWeek: 50, name: 'Art Basel Miami', volumeMult: 1.2, pricePremium: 0.03, emergingBoost: 10 },
    ],

    // Summer quiet period
    summerQuiet: { startWeek: 25, endWeek: 35, volumeMult: 0.5, pricePremium: -0.03 },

    // ── Monthly overrides ────────────────────────────
    // Per-month price premium/penalties (week 1 = first week of January)
    // Example: to boost July prices, set month 7's premium to 0.10
    monthlyOverrides: {
        1: { pricePremium: 0, volumeMult: 1.0, label: 'January' },
        2: { pricePremium: 0, volumeMult: 1.0, label: 'February' },
        3: { pricePremium: 0.02, volumeMult: 1.1, label: 'March (Spring preview)' },
        4: { pricePremium: 0, volumeMult: 1.0, label: 'April' },
        5: { pricePremium: 0.03, volumeMult: 1.2, label: 'May (Art Basel prep)' },
        6: { pricePremium: 0.05, volumeMult: 1.3, label: 'June (Art Basel)' },
        7: { pricePremium: -0.02, volumeMult: 0.6, label: 'July (Summer quiet)' },
        8: { pricePremium: -0.03, volumeMult: 0.5, label: 'August (Summer quiet)' },
        9: { pricePremium: 0.01, volumeMult: 0.9, label: 'September (Return)' },
        10: { pricePremium: 0.02, volumeMult: 1.1, label: 'October (Frieze)' },
        11: { pricePremium: 0.06, volumeMult: 1.5, label: 'November (Fall auctions)' },
        12: { pricePremium: 0.04, volumeMult: 1.3, label: 'December (Basel Miami)' },
    },

    // ── 3. Macro Events ─────────────────────────────
    // Probability per year that each event type fires.
    // Duration is random within [min, max] weeks.
    macroEvents: {
        recession: {
            probabilityPerYear: 0.08,       // ~8% chance per year
            durationWeeksMin: 26,
            durationWeeksMax: 52,
            heatImpactPerWeek: -2,           // Heat drops 2/week
            priceImpactPerWeek: -0.005,      // -0.5%/week
            description: '📉 Global economic downturn. Art market contracts.',
        },
        bubble: {
            probabilityPerYear: 0.06,
            durationWeeksMin: 12,
            durationWeeksMax: 26,
            heatImpactPerWeek: 3,
            priceImpactPerWeek: 0.008,
            description: '📈 Speculative bubble forms. Prices surge.',
        },
        scandal: {
            probabilityPerYear: 0.10,
            durationWeeksMin: 4,
            durationWeeksMax: 12,
            heatImpactPerWeek: -1,
            priceImpactPerWeek: -0.002,
            targetedHeatDrop: 40,           // Targeted artist loses this much
            description: '⚠️ Art world scandal. Confidence shaken.',
        },
        museum_acquisition: {
            probabilityPerYear: 0.15,
            durationWeeksMin: 2,
            durationWeeksMax: 4,
            heatImpactPerWeek: 0,
            priceImpactPerWeek: 0,
            targetedHeatBoost: 20,          // Targeted artist gains this much
            description: '🏛️ Major museum acquisition boosts artist.',
        },
        art_fair_boom: {
            probabilityPerYear: 0.12,
            durationWeeksMin: 2,
            durationWeeksMax: 6,
            heatImpactPerWeek: 2,
            priceImpactPerWeek: 0.003,
            description: '🎨 Art fair delivers record sales.',
        },
    },

    // ── 4. Simulation Parameters ────────────────────
    simulation: {
        yearsOfHistory: 5,          // Generate this many years of seed data
        weeksPerYear: 52,
        seed: 42,                   // Deterministic seed (null = random each time)
        tradeFrequencyBase: 3,      // Average NPC trades per week
        enableLifecycle: true,      // Artist tier promotion over time
        enableCorrelation: true,    // Cross-artist correlated moves
        enableSeasonality: true,    // Auction calendar effects
        enableMacroEvents: true,    // Recessions, bubbles, etc.
        maxTradeLogSize: 2000,      // Max trades in the log
        priceHistoryWeeks: 260,     // Max weekly snapshots to keep
    },

    // ── 5. Per-Artist Overrides ─────────────────────
    // Override any parameter for a specific artist.
    // Example: to make artist_01 appreciate faster:
    //   artistOverrides: { artist_01: { annualDrift: 0.15, volatility: 0.30 } }
    artistOverrides: {},

    // ── 6. Custom Price Events ──────────────────────
    // Schedule specific price events at exact weeks.
    // Example: { week: 130, artistId: 'artist_02', priceMultiplier: 1.5, reason: 'Retrospective announced' }
    customEvents: [],
};

// ════════════════════════════════════════════════════
// MarketConfig — Runtime Configuration Manager
// ════════════════════════════════════════════════════

export class MarketConfig {

    static _overrides = null;

    /**
     * Initialize — load any persisted overrides from SettingsManager.
     */
    static init() {
        try {
            SettingsManager.init();
            const saved = SettingsManager.get('marketSimConfig');
            if (saved && typeof saved === 'object') {
                MarketConfig._overrides = saved;
            }
        } catch { /* SettingsManager may not be ready */ }
    }

    /**
     * Get a config value using dot notation.
     * @param {string} path — e.g. 'tiers.hot.annualDrift' or 'simulation.yearsOfHistory'
     * @returns {*} The config value
     */
    static get(path) {
        if (!MarketConfig._overrides) MarketConfig.init();

        // Check overrides first, then defaults
        const overrideVal = MarketConfig._resolve(MarketConfig._overrides, path);
        if (overrideVal !== undefined) return overrideVal;
        return MarketConfig._resolve(DEFAULTS, path);
    }

    /**
     * Set a config value using dot notation and persist.
     * @param {string} path — e.g. 'monthlyOverrides.7.pricePremium'
     * @param {*} value
     */
    static set(path, value) {
        if (!MarketConfig._overrides) MarketConfig._overrides = {};
        MarketConfig._assign(MarketConfig._overrides, path, value);
        MarketConfig._persist();
    }

    /**
     * Get the full resolved config (defaults merged with overrides).
     */
    static getAll() {
        if (!MarketConfig._overrides) MarketConfig.init();
        return MarketConfig._deepMerge(DEFAULTS, MarketConfig._overrides || {});
    }

    /**
     * Get just the defaults (no overrides applied).
     */
    static getDefaults() {
        return { ...DEFAULTS };
    }

    /**
     * Reset all overrides back to defaults.
     */
    static reset() {
        MarketConfig._overrides = {};
        MarketConfig._persist();
    }

    /**
     * Reset a specific path back to default.
     */
    static resetPath(path) {
        if (!MarketConfig._overrides) return;
        MarketConfig._deletePath(MarketConfig._overrides, path);
        MarketConfig._persist();
    }

    /**
     * Get tier configuration for a specific artist (with overrides applied).
     */
    static getTierConfig(tier, artistId) {
        const base = MarketConfig.get(`tiers.${tier}`) || DEFAULTS.tiers.emerging;
        const artistOverride = MarketConfig.get(`artistOverrides.${artistId}`);
        if (artistOverride) {
            return { ...base, ...artistOverride };
        }
        return base;
    }

    /**
     * Get the seasonal multiplier for a given year-week (1-52).
     */
    static getSeasonalMultiplier(yearWeek) {
        const month = MarketConfig._weekToMonth(yearWeek);
        const override = MarketConfig.get(`monthlyOverrides.${month}`);
        if (override && override.pricePremium !== undefined) {
            return 1.0 + override.pricePremium;
        }
        return 1.0;
    }

    /**
     * Get the volume multiplier for a given year-week (1-52).
     */
    static getVolumeMultiplier(yearWeek) {
        const month = MarketConfig._weekToMonth(yearWeek);
        const override = MarketConfig.get(`monthlyOverrides.${month}`);
        if (override && override.volumeMult !== undefined) {
            return override.volumeMult;
        }
        return 1.0;
    }

    /**
     * Export current config as JSON string (for sharing/backup).
     */
    static export() {
        return JSON.stringify(MarketConfig.getAll(), null, 2);
    }

    /**
     * Import a config from JSON string.
     */
    static import(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            MarketConfig._overrides = parsed;
            MarketConfig._persist();
            return true;
        } catch (e) {
            console.error('[MarketConfig] Invalid JSON import:', e);
            return false;
        }
    }

    // ── Private Helpers ──

    static _persist() {
        try {
            SettingsManager.set('marketSimConfig', MarketConfig._overrides || {});
        } catch { /* non-critical */ }
    }

    static _resolve(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((cur, key) => {
            return cur && cur[key] !== undefined ? cur[key] : undefined;
        }, obj);
    }

    static _assign(obj, path, value) {
        const parts = path.split('.');
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
                cur[parts[i]] = {};
            }
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }

    static _deletePath(obj, path) {
        const parts = path.split('.');
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) return;
            cur = cur[parts[i]];
        }
        delete cur[parts[parts.length - 1]];
    }

    static _deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
                && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                result[key] = MarketConfig._deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    static _weekToMonth(yearWeek) {
        // Approximate: week 1-4 = Jan, 5-8 = Feb, etc.
        return Math.min(12, Math.max(1, Math.ceil(yearWeek / 4.33)));
    }
}
