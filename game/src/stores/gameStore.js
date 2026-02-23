/**
 * gameStore.js — Legacy Zustand store for basic game state.
 *
 * WARNING: This is a PRE-AUDIT store. The canonical game state lives in
 * GameState.state (singleton pattern in managers/GameState.js).
 * Do NOT write to this store outside of WeekEngine.advanceWeek().
 * This store exists for Zustand persistence compatibility and for
 * React components that need to subscribe to state changes.
 *
 * Key exports:
 *   useGameStore — React hook for subscribing to week/capital/stats changes
 *   useGameStore.getState() — non-React access
 *
 * Persisted to localStorage as 'artlife-game-store'.
 * Uses immer for immutable updates + subscribeWithSelector for granular subscriptions.
 *
 * Consumers: MarketDashboard, CalendarHUD, AdminDashboard (read-only)
 */
import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useGameStore = create(
    subscribeWithSelector(
        persist(
            immer((set, get) => ({
                currentWeek: 1,
                currentYear: 1980,
                capital: 10000,
                stats: {
                    reputation: 50,
                    taste: 50,
                    audacity: 30,
                    access: 50,
                    intel: 0
                },
                antiStats: {
                    marketHeat: 0,
                    suspicion: 0,
                    burnout: 0
                },
                portfolio: [],

                advanceWeek: () => set((state) => {
                    // Time advancement
                    state.currentWeek += 1;
                    if (state.currentWeek > 52) {
                        state.currentWeek = 1;
                        state.currentYear += 1;
                    }

                    // Systemic Heat Decay (world forgetting player's noise)
                    if (state.antiStats.marketHeat > 0) {
                        state.antiStats.marketHeat = Math.max(0, state.antiStats.marketHeat - 10);
                    }
                    if (state.antiStats.suspicion > 0) {
                        state.antiStats.suspicion = Math.max(0, state.antiStats.suspicion - 5);
                    }
                }),

                setCapital: (amount) => set((state) => {
                    state.capital = amount;
                }),

                updateStat: (statName, amount) => set((state) => {
                    if (state.stats[statName] !== undefined) {
                        state.stats[statName] = Math.max(0, Math.min(100, state.stats[statName] + amount));
                    }
                }),

                updateAntiStat: (statName, amount) => set((state) => {
                    if (state.antiStats[statName] !== undefined) {
                        state.antiStats[statName] = Math.max(0, Math.min(100, state.antiStats[statName] + amount));
                    }
                }),

                getTime: () => {
                    const { currentWeek, currentYear } = get();
                    return { week: currentWeek, year: currentYear };
                }
            })),
            { name: 'artlife-game-store' }
        )
    )
);
