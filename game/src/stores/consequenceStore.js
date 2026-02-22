import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/id.js';

/**
 * ConsequenceStore — persistent Zustand store for delayed consequences.
 *
 * Mirrors ConsequenceScheduler's queue but persists across saves.
 * The ConsequenceScheduler still handles runtime execution;
 * this store provides persistence and UI read access.
 *
 * Types: 'phone_message' | 'stat_change' | 'news' | 'event_unlock' | 'scene'
 */
export const useConsequenceStore = create(
    persist(
        immer((set, get) => ({
            queue: [],          // { id, triggerWeek, type, payload, sourceEvent, fired }
            firedHistory: [],   // last 20 fired consequences for journal

            /**
             * Schedule a new consequence.
             */
            schedule: (consequence) => set((state) => {
                state.queue.push({
                    id: consequence.id || generateId('csq'),
                    triggerWeek: consequence.triggerWeek,
                    type: consequence.type,
                    payload: consequence.payload,
                    sourceEvent: consequence.sourceEvent || null,
                    fired: false,
                    createdWeek: consequence.createdWeek || null,
                });
            }),

            /**
             * Schedule relative to current week.
             */
            scheduleRelative: (currentWeek, weeksFromNow, type, payload, sourceEvent) => set((state) => {
                state.queue.push({
                    id: generateId('csq'),
                    triggerWeek: currentWeek + weeksFromNow,
                    type,
                    payload,
                    sourceEvent: sourceEvent || null,
                    fired: false,
                    createdWeek: currentWeek,
                });
            }),

            /**
             * Mark a consequence as fired (called by ConsequenceScheduler.execute).
             */
            markFired: (consequenceId) => set((state) => {
                const item = state.queue.find(c => c.id === consequenceId);
                if (item) {
                    item.fired = true;
                    state.firedHistory.push({ ...item });
                    if (state.firedHistory.length > 20) {
                        state.firedHistory.shift();
                    }
                }
            }),

            /**
             * Remove a pending consequence by id.
             */
            remove: (consequenceId) => set((state) => {
                state.queue = state.queue.filter(c => c.id !== consequenceId);
            }),

            /**
             * Get all pending (unfired) consequences.
             */
            getPending: () => {
                return get().queue.filter(c => !c.fired);
            },

            /**
             * Get consequences due this week or earlier (unfired).
             */
            getDue: (currentWeek) => {
                return get().queue.filter(c => !c.fired && c.triggerWeek <= currentWeek);
            },

            /**
             * Get recently fired consequences for journal display.
             */
            getRecent: (count = 5) => {
                return get().firedHistory.slice(-count);
            },

            /**
             * Clean up old fired consequences from the queue.
             */
            cleanup: () => set((state) => {
                state.queue = state.queue.filter(c => !c.fired);
            }),

            reset: () => set((state) => {
                state.queue = [];
                state.firedHistory = [];
            }),
        })),
        {
            name: 'artlife-consequence-store',
            partialize: (state) => ({
                queue: state.queue.filter(c => !c.fired), // Only persist unfired
                firedHistory: state.firedHistory,
            }),
        }
    )
);
