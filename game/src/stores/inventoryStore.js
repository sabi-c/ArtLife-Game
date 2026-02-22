import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

/**
 * InventoryStore — player's special items, documents, and tools.
 *
 * NOT artworks (those live in GameState.state.portfolio).
 * This is for narrative items: business cards, contraband,
 * gifts, documents, tools gained through dialogue/events.
 *
 * Each item has provenance tracking for the Decision Journal.
 */
export const useInventoryStore = create(
    persist(
        immer((set, get) => ({
            items: [],

            /**
             * Add a special item with provenance metadata.
             * @param {object} item - { id, name, type, description, ... }
             * @param {object} [provenance] - { acquiredFrom, method, week, event }
             */
            addItem: (item, provenance = {}) => set((state) => {
                if (state.items.some(i => i.id === item.id)) return;
                state.items.push({
                    ...item,
                    type: item.type || 'misc',
                    acquiredAt: Date.now(),
                    provenance: {
                        acquiredFrom: provenance.acquiredFrom || item.acquiredFrom || 'unknown',
                        method: provenance.method || item.method || 'found',
                        week: provenance.week || null,
                        event: provenance.event || null,
                    },
                });
            }),

            removeItem: (itemId) => set((state) => {
                state.items = state.items.filter(i => i.id !== itemId);
            }),

            hasItem: (itemId) => {
                return get().items.some(i => i.id === itemId);
            },

            getItem: (itemId) => {
                return get().items.find(i => i.id === itemId) || null;
            },

            /**
             * Get items filtered by type.
             * Types: 'document', 'contraband', 'gift', 'tool', 'key_item', 'misc'
             */
            getItemsByType: (type) => {
                return get().items.filter(i => i.type === type);
            },

            /**
             * Revalue all items based on current market conditions.
             * Only affects items with a `baseValue` property.
             */
            revalueAll: (multiplier = 1.0) => set((state) => {
                state.items.forEach(item => {
                    if (item.baseValue) {
                        item.currentValue = Math.round(item.baseValue * multiplier);
                    }
                });
            }),

            /**
             * Get total count of items by type (for UI badges).
             */
            getCountByType: (type) => {
                return get().items.filter(i => i.type === type).length;
            },

            reset: () => set((state) => {
                state.items = [];
            }),
        })),
        { name: 'artlife-inventory-store' }
    )
);
