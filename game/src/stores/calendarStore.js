import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export const useCalendarStore = create(
    persist(
        immer((set, get) => ({
            scheduledEvents: [],

            /**
             * Schedule a new event. Deduplicates by eventId.
             */
            scheduleEvent: (event) => set((state) => {
                const exists = state.scheduledEvents.some(e => e.id === event.id);
                if (exists) {
                    console.warn(`[CalendarStore] Event ${event.id} already scheduled. Skipping.`);
                    return;
                }
                // Validate required fields
                if (!event.week || !event.year || !event.id) {
                    console.error(`[CalendarStore] Invalid event:`, event);
                    return;
                }
                state.scheduledEvents.push(event);
            }),

            /**
             * Called by the master GameTick on every [ End Week ].
             * Returns events that should fire this week.
             */
            getTriggeredEvents: (week, year) => {
                return get().scheduledEvents.filter(e =>
                    e.week === week && e.year === year
                );
            },

            /**
             * Remove a fired event so it doesn't retrigger.
             * Repeatable events are NOT removed.
             */
            consumeEvent: (eventId) => set((state) => {
                const index = state.scheduledEvents.findIndex(e => e.id === eventId);
                if (index !== -1 && !state.scheduledEvents[index].isRepeatable) {
                    state.scheduledEvents.splice(index, 1);
                }
            }),

            /**
             * Get events for UI display (next N weeks).
             */
            getUpcoming: (currentWeek, currentYear, windowWeeks = 12) => {
                return get().scheduledEvents.filter(e => {
                    const eventTime = e.year * 52 + e.week;
                    const nowTime = currentYear * 52 + currentWeek;
                    return eventTime >= nowTime && eventTime <= nowTime + windowWeeks;
                }).sort((a, b) => (a.year * 52 + a.week) - (b.year * 52 + b.week));
            }
        })),
        { name: 'artlife-calendar-store' }
    )
);
