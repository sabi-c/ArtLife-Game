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

                    state.artistSnapshots[artist.id] = {
                        heat: artist.heat,
                        name: artist.name,
                        tier: artist.tier,
                        trend,
                        buybackActive: artist.buybackActive || false,
                    };

                    // Record price history
                    if (!state.priceHistory[artist.id]) {
                        state.priceHistory[artist.id] = [];
                    }
                    // Average price of this artist's works on market
                    const artistWorks = (works || []).filter(w => w.artistId === artist.id);
                    const avgPrice = artistWorks.length > 0
                        ? Math.round(artistWorks.reduce((sum, w) => sum + (w.price || w.basePrice), 0) / artistWorks.length)
                        : null;

                    if (avgPrice !== null) {
                        state.priceHistory[artist.id].push({ week, avgPrice });
                        // Keep last 26 weeks
                        if (state.priceHistory[artist.id].length > 26) {
                            state.priceHistory[artist.id].shift();
                        }
                    }
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
