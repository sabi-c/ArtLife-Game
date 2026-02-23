import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

/**
 * MarketStore — Zustand store for market state that persists across saves.
 *
 * Syncs with MarketManager (the simulation engine) each week.
 * Provides price history for sparklines, artist heat snapshots,
 * and weekly market intelligence for the dashboard.
 */
export const useMarketStore = create(
    persist(
        immer((set, get) => ({
            // Artist heat snapshots: { artistId: { heat, name, trend } }
            artistSnapshots: {},

            // Price history per artist: { artistId: [{ week, avgPrice }] }
            priceHistory: {},

            // Current market cycle: bull | bear | flat
            marketCycle: 'flat',

            // Weekly generated market news/intelligence
            weeklyNews: [],

            // Works currently available on market (synced from MarketManager)
            availableWorks: [],

            // Intra-week price buffer per artist (for live Bloomberg sparklines)
            // Not persisted — session-only display data, cleared on week advance
            intraWeekPrices: {},

            /**
             * Record a micro-tick price snapshot per artist for intra-week sparklines.
             * Called from MarketManager.microTick() or advanceTime().
             */
            recordMicroTick: (artists, works) => set((state) => {
                for (const artist of (artists || [])) {
                    if (!state.intraWeekPrices[artist.id]) state.intraWeekPrices[artist.id] = [];
                    const artistWorks = (works || []).filter(w => w.artistId === artist.id && w.onMarket);
                    if (artistWorks.length === 0) continue;
                    const avgPrice = Math.round(artistWorks.reduce((s, w) => s + w.price, 0) / artistWorks.length);
                    state.intraWeekPrices[artist.id].push(avgPrice);
                    // Keep last 50 data points per artist
                    if (state.intraWeekPrices[artist.id].length > 50) {
                        state.intraWeekPrices[artist.id] = state.intraWeekPrices[artist.id].slice(-50);
                    }
                }
            }),

            /** Clear intra-week buffer on week advance (fresh sparklines each week) */
            clearIntraWeekPrices: () => set((state) => { state.intraWeekPrices = {}; }),

            /**
             * Sync state from MarketManager after each tick.
             * Called by WeekEngine or TerminalAPI.
             */
            syncFromManager: (artists, works, marketState, week) => set((state) => {
                state.marketCycle = marketState || 'flat';

                // Snapshot each artist's heat
                (artists || []).forEach(artist => {
                    const prev = state.artistSnapshots[artist.id];
                    const trend = prev
                        ? (artist.heat > prev.heat ? 'up' : artist.heat < prev.heat ? 'down' : 'flat')
                        : 'flat';

                    // Record price history FIRST so we can calculate the Artist Index
                    if (!state.priceHistory[artist.id]) {
                        state.priceHistory[artist.id] = [];
                    }

                    const artistWorks = (works || []).filter(w => w.artistId === artist.id);
                    const prices = artistWorks.map(w => w.price || w.basePrice);
                    const volume = prices.length;

                    let avgPrice = null;
                    if (volume > 0) {
                        avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / volume);
                        const highPrice = Math.max(...prices);
                        const lowPrice = Math.min(...prices);

                        state.priceHistory[artist.id].push({ week, avgPrice, highPrice, lowPrice, volume });
                        // Keep last 26 weeks
                        if (state.priceHistory[artist.id].length > 26) {
                            state.priceHistory[artist.id].shift();
                        }
                    }

                    // Calculate Artist Index (Base 500 + heat*5 + velocity modifier)
                    let indexDelta = 0;
                    const history = state.priceHistory[artist.id] || [];
                    if (history.length > 1 && avgPrice !== null) {
                        const prevAvg = history[history.length - 2].avgPrice;
                        if (prevAvg > 0) {
                            // Weight the percentage change so a 10% jump adds +100 to the index
                            indexDelta = ((avgPrice - prevAvg) / prevAvg) * 100 * 10;
                        }
                    }

                    const artistIndex = Math.round(500 + (artist.heat * 5) + indexDelta);

                    state.artistSnapshots[artist.id] = {
                        heat: artist.heat,
                        name: artist.name,
                        tier: artist.tier,
                        trend,
                        buybackActive: artist.buybackActive || false,
                        artistIndex,
                    };
                });

                // Update available works
                state.availableWorks = (works || [])
                    .filter(w => w.onMarket)
                    .map(w => ({ ...w }));
            }),

            /**
             * Generate weekly market intelligence news items.
             */
            generateWeeklyNews: (artists) => set((state) => {
                const news = [];
                const snapshots = state.artistSnapshots;

                (artists || []).forEach(artist => {
                    const snap = snapshots[artist.id];
                    if (!snap) return;

                    // Big movers
                    if (snap.trend === 'up' && artist.heat > 60) {
                        news.push(`${artist.name} is surging — heat at ${Math.round(artist.heat)}.`);
                    } else if (snap.trend === 'down' && artist.heat < 25) {
                        news.push(`${artist.name}'s market cooling rapidly. Potential buying opportunity.`);
                    }

                    // Buyback alerts (only visible at high intel)
                    if (snap.buybackActive) {
                        news.push(`[INTEL] Gallery buyback detected for ${artist.name}. Artificial floor active.`);
                    }
                });

                // Market cycle news
                if (state.marketCycle === 'bull') {
                    news.push('Bull market conditions. Broad price increases expected.');
                } else if (state.marketCycle === 'bear') {
                    news.push('Bear market. Collectors holding — prices under pressure.');
                }

                // Keep max 6 news items
                state.weeklyNews = news.slice(0, 6);
            }),

            /**
             * Get price trend data for an artist (for sparklines).
             */
            getArtistPriceTrend: (artistId) => {
                const history = get().priceHistory[artistId] || [];
                return history.map(h => h.avgPrice);
            },

            /**
             * Boost a specific artist's heat in the snapshot.
             */
            boostArtistHeat: (artistId, amount) => set((state) => {
                const snap = state.artistSnapshots[artistId];
                if (snap) {
                    snap.heat = Math.min(100, Math.max(0, snap.heat + amount));
                    snap.trend = amount > 0 ? 'up' : 'down';
                }
            }),

            reset: () => set((state) => {
                state.artistSnapshots = {};
                state.priceHistory = {};
                state.marketCycle = 'flat';
                state.weeklyNews = [];
                state.availableWorks = [];
                state.intraWeekPrices = {};
            }),
        })),
        {
            name: 'artlife-market-store',
            partialize: (state) => ({
                artistSnapshots: state.artistSnapshots,
                priceHistory: state.priceHistory,
                marketCycle: state.marketCycle,
                // Don't persist weeklyNews or availableWorks — regenerated each week
            }),
        }
    )
);
