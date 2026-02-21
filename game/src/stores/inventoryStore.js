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

            hasItem: (itemId) => {
                return get().items.some(i => i.id === itemId);
            },

            addItem: (item) => set((state) => {
                if (!state.items.some(i => i.id === item.id)) {
                    state.items.push({
                        ...item,
                        acquiredAt: item.acquiredAt || Date.now()
                    });
                }
            }),

            removeItem: (itemId) => set((state) => {
                state.items = state.items.filter(i => i.id !== itemId);
            })
        })),
        { name: 'artlife-inventory-store' }
    )
);
