import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export const useInventoryStore = create(
    persist(
        immer((set, get) => ({
            items: [], // special items, not regular artworks

            revalueAll: () => set((state) => {
                // To be implemented: value updates based on market Store
            }),

            addItem: (item) => set((state) => {
                state.items.push(item);
            }),

            removeItem: (itemId) => set((state) => {
                state.items = state.items.filter(i => i.id !== itemId);
            })
        })),
        { name: 'artlife-inventory-store' }
    )
);
