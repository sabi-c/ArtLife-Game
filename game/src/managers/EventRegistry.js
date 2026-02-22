import { useEventStore } from '../stores/eventStore.js';
import { GameState } from './GameState.js';
import { QualityGate } from './QualityGate.js';

/**
 * EventRegistry — Oregon Trail-style pacing + Quality Gate filtering.
 * Connects the Zustand eventStore to the active GameState and Scenes.
 * Replaces EventManager (Phase 2.7+ Update).
 */
export class EventRegistry {
    static jsonEvents = [];
    static jsonStorylines = [];

    static getEvent(id) {
        // Priority 1: Check the decoupled JSON file
        const jsonRecord = this.jsonEvents?.find(e => e.id === id);
        if (jsonRecord) return jsonRecord;

        // Priority 2: Fallback to the legacy JS-bound events in the Zustand store
        return useEventStore.getState().getEvent(id);
    }

    static getAvailableEvents(category = null, state = GameState.state) {
        const store = useEventStore.getState();
        const allEvents = [...(this.jsonEvents || []), ...store.eventPool];

        // Deduplicate events by ID to prevent legacy overlaps
        const uniqueEventsMap = new Map();
        allEvents.forEach(e => uniqueEventsMap.set(e.id, e));
        const uniqueEvents = Array.from(uniqueEventsMap.values());

        return uniqueEvents.filter((event) => {
            if (category && event.category !== category) return false;

            // Class restriction check
            if (event.classRestriction && event.classRestriction !== state.character.id) return false;

            // Don't repeat the last 5 events
            if (store.recentEventIds.includes(event.id)) return false;

            // Min-week check for rare events
            if (event.frequency?.[0] > 1 && state.week < event.frequency[0]) return false;

            // Quality Gate check
            if (event.requirements && !QualityGate.check(event.requirements)) return false;

            return true;
        });
    }

    static checkForEvent() {
        const state = GameState.state;
        const store = useEventStore.getState();

        // ── Priority queue: consequence-scheduled events fire first ──
        const priorityEventId = store.popPriorityEvent();
        if (priorityEventId) {
            const event = this.getEvent(priorityEventId);
            if (event) {
                state.eventsTriggered.push(event.id);
                store.recordEventTriggered(event.id, state.week);
                return event;
            }
        }

        const weeksSinceLastEvent = state.week - store.lastEventWeek;

        // Oregon Trail pacing: ~75% chance of an event every turn
        let probability;
        if (weeksSinceLastEvent === 0) probability = 0.0;
        else if (weeksSinceLastEvent === 1) probability = 0.70;
        else if (weeksSinceLastEvent === 2) probability = 0.90;
        else probability = 0.98;

        if (Math.random() > probability) return null;

        // Pick eligible events
        const eligible = this.getAvailableEvents(null, state);

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

    /**
     * Check if a player choice in an event should activate a storyline.
     * Called by DialogueScene when a choice is made.
     * @param {string} eventId - the event the choice was made in
     * @param {number} choiceIndex - the index of the chosen option
     */
    static checkStorylineTrigger(eventId, choiceIndex) {
        if (!this.jsonStorylines?.length) return;

        const matching = this.jsonStorylines.filter(
            s => s.triggerEventId === eventId && s.triggerChoiceIndex === choiceIndex
        );

        if (matching.length === 0) return;

        // Lazy import to avoid circular deps
        import('../stores/storylineStore.js').then(({ useStorylineStore }) => {
            const currentWeek = GameState.state?.week || 1;
            for (const storyline of matching) {
                useStorylineStore.getState().activateStoryline(
                    storyline.id, currentWeek, storyline
                );
            }
        });
    }

    /**
     * Get all storyline definitions (for CMS and tickWeek).
     */
    static getStorylines() {
        return this.jsonStorylines || [];
    }
}
