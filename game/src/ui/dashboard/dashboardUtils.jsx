/**
 * dashboardUtils.js — Bloomberg Terminal shared utilities
 *
 * Intel-gated data masking, AP (Action Point) helpers,
 * number formatting, and price display utilities.
 */

import React from 'react';
import { GameState } from '../../managers/GameState.js';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { useEventStore } from '../../stores/eventStore.js';
import { resolveArtworkUrl } from '../../utils/assets.js';

export const resolveImageUrl = resolveArtworkUrl;

// ════════════════════════════════════════════════════════════
// Intel-gated data masking
// ════════════════════════════════════════════════════════════

export function mask(value, intel, threshold, fallback = '???') {
    return intel >= threshold ? value : fallback;
}

export function maskPrice(price, intel, inquire = false) {
    if (inquire) return 'Price on Request';
    const p = Number(price) || 0;
    if (intel >= 40) return `$${p.toLocaleString()}`;
    if (intel >= 20) return `$${(Math.round(p / 10000) * 10000).toLocaleString()}`;
    return '$???';
}

// ════════════════════════════════════════════════════════════
// Number formatting
// ════════════════════════════════════════════════════════════

/** Safe number formatting — prevents toLocaleString crashes on undefined/NaN */
export function fmtNum(val) { return (Number(val) || 0).toLocaleString(); }

/** Format price with full decimals for tearsheet (Seventh House style) */
export function tearsheetPrice(price) {
    return `$ ${(Number(price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ════════════════════════════════════════════════════════════
// Mini Sparkline SVG
// ════════════════════════════════════════════════════════════

export function MiniSparkline({ data, width = 60, height = 20, color = '#00e5ff' }) {
    if (!data || data.length < 2) return <span className="bb-no-data">--</span>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
    ).join(' ');
    return (
        <svg width={width} height={height} className="bb-sparkline-svg">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

// ════════════════════════════════════════════════════════════
// AP (Action Point) helpers
// ════════════════════════════════════════════════════════════

export const MAX_ACTIONS = 4;
export function getAP() { return MAX_ACTIONS - (GameState.state?.actionsThisWeek || 0); }
export function hasAP(cost = 1) { return getAP() >= cost; }
export function useAP(label, cost = 1) {
    if (!GameState.state) return false;
    GameState.state.actionsThisWeek = (GameState.state.actionsThisWeek || 0) + cost;
    GameState.addNews(`⏱️ ${label} (${getAP()} AP left)`);
    return true;
}

/**
 * Wrapper that uses AP and checks for intra-week timed events.
 * Fires mid-week events when AP drops to 2, end-of-week events at 0 AP.
 */
export function useAPAndCheckEvents(label, cost = 1) {
    const before = getAP();
    useAP(label, cost);
    const after = getAP();

    // Mid-week threshold: just crossed from >2 to <=2 AP remaining
    if (after <= 2 && before > 2) {
        const midEvent = EventRegistry.checkForTimedEvent('mid');
        if (midEvent) useEventStore.getState().setPendingEvent(midEvent);
    }
    // End-of-week: AP hit 0
    if (after === 0) {
        const endEvent = EventRegistry.checkForTimedEvent('end');
        if (endEvent) useEventStore.getState().setPendingEvent(endEvent);
    }
}

// ════════════════════════════════════════════════════════════
// NPC role colors
// ════════════════════════════════════════════════════════════

export const ROLE_COLORS = {
    gallerist: '#2a6e2a',
    auction: '#003da5',
    artist: '#8b2020',
    collector: '#6a4c93',
    advisor: '#0066cc',
    mega_dealer: '#c9a84c',
    speculator: '#cc0000',
    young_hustler: '#ff6600',
    institutional: '#555',
};
