/**
 * useBloombergFeed — Zustand-derived hook for Bloomberg Terminal UI.
 *
 * Computes derived market data: artist leaderboard, movers, composite index,
 * volume leaders, cycle info, and intra-week sparklines. All data is
 * reactive via Zustand selectors.
 *
 * Consumed by BloombergTerminal.jsx.
 */

import { useMemo } from 'react';
import { useMarketStore } from '../stores/marketStore.js';
import { MarketSimulator } from '../managers/MarketSimulator.js';
import { CONTACTS } from '../data/contacts.js';
import { ARTWORKS } from '../data/artworks.js';

/** Map market cycle to display color */
function cycleColor(cycle) {
    if (cycle === 'bull') return '#4caf50';
    if (cycle === 'bear') return '#c94040';
    return '#5a5a6a';
}

/** Compute biggest movers by comparing current heat to previous snapshot */
function computeMovers(artistSnapshots, priceHistory) {
    return Object.entries(artistSnapshots)
        .map(([id, snap]) => {
            const history = priceHistory[id] || [];
            let delta = 0;
            if (history.length >= 2) {
                const prev = history[history.length - 2].avgPrice;
                const curr = history[history.length - 1].avgPrice;
                if (prev > 0) delta = ((curr - prev) / prev) * 100;
            }
            return { id, name: snap.name, heat: snap.heat, delta, trend: snap.trend, tier: snap.tier };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Compute volume leaders from trade log */
function computeVolumeLeaders() {
    const log = MarketSimulator.getTradeLog();
    const volumeByNpc = {};
    for (const t of log) {
        volumeByNpc[t.buyer] = (volumeByNpc[t.buyer] || 0) + t.price;
        volumeByNpc[t.seller] = (volumeByNpc[t.seller] || 0) + t.price;
    }
    return Object.entries(volumeByNpc)
        .map(([id, vol]) => {
            const c = CONTACTS.find(c => c.id === id);
            return { id, name: c?.name || id, volume: vol };
        })
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);
}

/** Average of all artist indices */
function computeCompositeIndex(artistSnapshots) {
    const vals = Object.values(artistSnapshots).map(s => s.artistIndex || 500);
    if (vals.length === 0) return 500;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function useBloombergFeed() {
    const artistSnapshots = useMarketStore(s => s.artistSnapshots);
    const priceHistory = useMarketStore(s => s.priceHistory);
    const intraWeekPrices = useMarketStore(s => s.intraWeekPrices);
    const marketCycle = useMarketStore(s => s.marketCycle);
    const compositeHistory = useMarketStore(s => s.compositeHistory);
    const sectorHistory = useMarketStore(s => s.sectorHistory);
    const eventLog = useMarketStore(s => s.eventLog);

    return useMemo(() => ({
        // Artist leaderboard sorted by index (descending)
        leaderboard: Object.entries(artistSnapshots)
            .map(([id, snap]) => ({ id, ...snap }))
            .sort((a, b) => (b.artistIndex || 0) - (a.artistIndex || 0)),

        // Biggest movers by price delta
        movers: computeMovers(artistSnapshots, priceHistory),

        // NPC volume leaders
        volumeLeaders: computeVolumeLeaders(),

        // Market cycle with display color
        cycle: { state: marketCycle, color: cycleColor(marketCycle) },

        // Composite market index (avg of all artist indices)
        compositeIndex: computeCompositeIndex(artistSnapshots),

        // Intra-week sparkline data per artist
        liveSparklines: intraWeekPrices || {},

        // Weekly price history per artist (for candlestick/line charts)
        priceHistory,

        // ── Multi-year historical data (from MarketHistoryEngine) ──

        // Composite index history: [{ week, composite, cycle }]
        compositeHistory: compositeHistory || [],

        // Sector index history: { tier: [{ week, index }] }
        sectorHistory: sectorHistory || {},

        // Market event log: [{ week, type, description, impact }]
        eventLog: eventLog || [],
    }), [artistSnapshots, priceHistory, intraWeekPrices, marketCycle, compositeHistory, sectorHistory, eventLog]);
}
