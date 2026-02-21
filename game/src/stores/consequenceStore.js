import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export const useConsequenceStore = create(
    persist(
        immer((set, get) => ({
            pendingConsequences: [],

            scheduleConsequence: (consequence) => set((state) => {
                state.pendingConsequences.push(consequence);
            }),

            getTriggeredConsequences: (week, year) => {
                // In ArtLife V2, consequences might just be tracked by week offset
                return get().pendingConsequences.filter(c => c.triggerWeek <= week);
            },

            removeConsequence: (id) => set((state) => {
                state.pendingConsequences = state.pendingConsequences.filter(c => c.id !== id);
            })
        })),
        { name: 'artlife-consequence-store' }
    )
);
