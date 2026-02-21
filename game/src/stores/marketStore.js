import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export const useMarketStore = create(
    persist(
        immer((set, get) => ({
            artists: [],
            works: [],

            recalculatePrices: (time) => set((state) => {
                // To be implemented: market price logic based on time and heat
            }),

            boostArtistHeat: (artistId, amount) => set((state) => {
                const artist = state.artists.find(a => a.id === artistId);
                if (artist) {
                    artist.heat = Math.min(100, Math.max(0, artist.heat + amount));
                }
            })
        })),
        { name: 'artlife-market-store' }
    )
);
