import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { EVENTS } from '../data/events.js';

export const useEventStore = create(
    persist(
        immer((set, get) => ({
            eventPool: EVENTS, // Start with statically imported events
            lastEventWeek: 0,
            recentEventIds: [],
            priorityQueue: [],
            pendingEvent: null,

            // Rehydrate the event pool on app start in case new events were added to code
            init: () => set((state) => {
                state.eventPool = EVENTS;
            }),

            reset: () => set((state) => {
                state.lastEventWeek = 0;
                state.recentEventIds = [];
                state.priorityQueue = [];
                state.pendingEvent = null;
                state.eventPool = EVENTS;
            }),

            getEvent: (id) => {
                return get().eventPool.find(e => e.id === id);
            },

            addPriorityEvent: (eventId) => set((state) => {
                if (!state.priorityQueue.includes(eventId)) {
                    state.priorityQueue.push(eventId);
                }
            }),

            popPriorityEvent: () => {
                const state = get();
                if (state.priorityQueue.length > 0) {
                    const eventId = state.priorityQueue[0];
                    set((s) => { s.priorityQueue.shift(); });
                    return eventId;
                }
                return null;
            },

            recordEventTriggered: (eventId, week) => set((state) => {
                state.lastEventWeek = week;
                state.recentEventIds.push(eventId);
                if (state.recentEventIds.length > 5) {
                    state.recentEventIds.shift();
                }
            }),

            setPendingEvent: (event) => set((state) => {
                state.pendingEvent = event;
            }),

            consumePendingEvent: () => {
                const event = get().pendingEvent;
                set((state) => { state.pendingEvent = null; });
                return event;
            }
        })),
        {
            name: 'artlife-event-store',
            partialize: (state) => ({
                lastEventWeek: state.lastEventWeek,
                recentEventIds: state.recentEventIds,
                priorityQueue: state.priorityQueue,
                pendingEvent: state.pendingEvent
                // Do not persist eventPool, it's loaded from code
            }),
        }
    )
);
