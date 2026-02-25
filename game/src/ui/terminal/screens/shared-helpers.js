/**
 * src/terminal/screens/shared-helpers.js
 * Shared helper functions extracted from dashboard.js so that other
 * terminal screens (ego.js, character.js, market.js, etc.) can import
 * them without loading the entire 1,700-line dashboard module.
 *
 * Exports:
 *   - Action budget: MAX_ACTIONS, getActionsRemaining, useAction, hasActions
 *   - Data viz: sparkline, statBarHtml
 *   - Content: generateFlavorNews
 */

import { TerminalAPI } from '../TerminalAPI.js';

// ════════════════════════════════════════════
// Action Budget System
// ════════════════════════════════════════════
export const MAX_ACTIONS = 4;

export function getActionsRemaining() {
    return MAX_ACTIONS - (TerminalAPI.state().actionsThisWeek || 0);
}

export function useAction(label, cost = 1) {
    if (!TerminalAPI.state().actionsThisWeek) TerminalAPI.state().actionsThisWeek = 0;
    TerminalAPI.state().actionsThisWeek += cost;
    TerminalAPI.addNews(`⏱️ ${label} (${getActionsRemaining()} AP left)`);
    // Auto-checkpoint after every action
    TerminalAPI.initGame.autoSave?.();
    return true;
}

export function hasActions(cost = 1) {
    return getActionsRemaining() >= cost;
}

// ════════════════════════════════════════════
// Data Visualization Helpers
// ════════════════════════════════════════════
const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/**
 * Convert a numeric array into a Unicode sparkline string.
 * @param {number[]} values - Data points
 * @param {number} [width=12] - Max characters wide
 * @returns {string} Sparkline like "▁▃▅▇▅▃▁"
 */
export function sparkline(values, width = 12) {
    if (!values || values.length === 0) return SPARK_CHARS[0].repeat(width);
    const nums = values.slice(-width);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    return nums.map(v => SPARK_CHARS[Math.round(((v - min) / range) * 7)]).join('');
}

/**
 * Generate an HTML progress bar for a stat.
 * @param {string} label - Stat abbreviation (e.g. "HYP")
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {string} color - CSS color for the bar fill
 * @returns {string} HTML string
 */
export function statBarHtml(label, value, max, color) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return `<div class="db-stat-bar">`
        + `<span class="db-stat-label">${label}</span>`
        + `<div class="db-stat-track"><div class="db-stat-fill" style="width:${pct}%;background:${color}"></div></div>`
        + `<span class="db-stat-val">${value}</span>`
        + `</div>`;
}

// ════════════════════════════════════════════
// Flavor News Generator
// ════════════════════════════════════════════
const FLAVOR_NEWS_POOL = {
    bull: [
        'BULL MARKET: Collectors panic-buying at fairs',
        'Art indices up 12% this quarter — speculation rampant',
        'Mega-galleries reporting record sales',
    ],
    bear: [
        'BEAR MARKET: Auction estimates slashed across the board',
        'Gallery closures accelerate as buyers retreat',
        'Secondary market prices softening — hold or sell?',
    ],
    flat: [
        'FLAT MARKET: Sideways trading, no clear momentum',
        'Collectors cautious — "wait and see" sentiment dominates',
        'Mid-market works holding steady while blue-chip stalls',
    ],
};

const CITY_FLAVOR = {
    'new-york': 'NEW YORK: Chelsea openings draw record crowds',
    'london': 'LONDON: Frieze week buzz building early',
    'paris': 'PARIS: Palais de Tokyo announces surprise group show',
    'berlin': 'BERLIN: Kreuzberg studios open for Rundgang',
    'hong-kong': 'HONG KONG: Art Basel HK announces expanded sector',
    'miami': 'MIAMI: Wynwood walls refresh draws collectors south',
    'los-angeles': 'LOS ANGELES: Hauser & Wirth expanding downtown',
    'switzerland': 'BASEL: Art Basel prep underway — hotel prices soaring',
};

/**
 * Generate 1-4 flavor news items based on market state and player context.
 * @param {object} s - Game state
 * @returns {string[]} Array of news strings
 */
export function generateFlavorNews(s) {
    const items = [];
    // Market-condition flavor
    const pool = FLAVOR_NEWS_POOL[s.marketState] || FLAVOR_NEWS_POOL.flat;
    items.push(pool[s.week % pool.length]);
    // City-specific
    if (CITY_FLAVOR[s.currentCity]) items.push(CITY_FLAVOR[s.currentCity]);
    // Stat-gated hints
    if (s.reputation >= 60) items.push('BUZZ: Your name is circulating in collector circles');
    else if (s.marketHeat > 30) items.push('HEAT: Galleries are watching your flip patterns');
    // Mix with real news
    if (s.newsFeed && s.newsFeed.length > 0) {
        const latest = s.newsFeed.slice(-2).reverse();
        latest.forEach(n => items.push(typeof n === 'string' ? n : n.text));
    }
    return items.slice(0, 4);
}
