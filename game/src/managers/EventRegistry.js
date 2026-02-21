import { useEventStore } from '../stores/eventStore.js';
import { GameState } from './GameState.js';
import { QualityGate } from './QualityGate.js';

/**
 * EventRegistry — Oregon Trail-style pacing + Quality Gate filtering.
 * Connects the Zustand eventStore to the active GameState and Scenes.
 * Replaces EventManager (Phase 2.7+ Update).
 */
export class EventRegistry {
    static checkForEvent() {
        const state = GameState.state;
        const store = useEventStore.getState();

        // ── Priority queue: consequence-scheduled events fire first ──
        const priorityEventId = store.popPriorityEvent();
        if (priorityEventId) {
            const event = store.getEvent(priorityEventId);
            if (event) {
                state.eventsTriggered.push(event.id);
                store.recordEventTriggered(event.id, state.week);
                return event;
            }
        }

        const weeksSinceLastEvent = state.week - store.lastEventWeek;

        // Oregon Trail pacing: ~75% chance of an event every turn
        let probability;
        if (weeksSinceLastEvent === 0) {
            probability = 0.0;
        } else if (weeksSinceLastEvent === 1) {
            probability = 0.70;
        } else if (weeksSinceLastEvent === 2) {
            probability = 0.90;
        } else {
            probability = 0.98;
        }

        if (Math.random() > probability) return null;

        // Pick eligible events
        const eligible = store.eventPool.filter((event) => {
            // Class restriction check
            if (event.classRestriction && event.classRestriction !== state.character.id) {
                return false;
            }

            // Don't repeat the last 5 events
            if (store.recentEventIds.includes(event.id)) {
                return false;
            }

            // Min-week check for rare events
            if (event.frequency[0] > 1 && state.week < event.frequency[0]) {
                return false;
            }

            // ── Quality Gate check ──
            // Events with requirements only fire if player meets them
            if (event.requirements && !QualityGate.check(event.requirements)) {
                return false;
            }

            return true;
        });

        if (eligible.length === 0) return null;

        // Weighted random selection
        const totalWeight = eligible.reduce((sum, e) => sum + (e.weight || 1), 0);
        let roll = Math.random() * totalWeight;
        let selected = eligible[0];

        for (const event of eligible) {
            roll -= (event.weight || 1);
            if (roll <= 0) {
                selected = event;
                break;
            }
        }

        // Record it
        state.eventsTriggered.push(selected.id);
        store.recordEventTriggered(selected.id, state.week);

        return selected;
    }

    static getPendingEvent() {
        return useEventStore.getState().consumePendingEvent();
    }
}
