import { useEventStore } from '../stores/eventStore.js';
import { GameState } from './GameState.js';
import { QualityGate } from './QualityGate.js';
import { useCmsStore } from '../stores/cmsStore.js';
import { ActivityLogger } from './ActivityLogger.js';
import { STORYLINES } from '../data/storylines.js';

/**
 * EventRegistry — Oregon Trail-style pacing + Quality Gate filtering.
 * Connects the Zustand eventStore to the active GameState and Scenes.
 * Replaces EventManager (Phase 2.7+ Update).
 */
export class EventRegistry {
    static jsonEvents = [];
    static jsonStorylines = STORYLINES || [];

    static getEvent(id) {
        // Priority 1: Check the decoupled JSON file
        const jsonRecord = this.jsonEvents?.find(e => e.id === id);
        if (jsonRecord) return jsonRecord;

        // Priority 2: Fallback to the legacy JS-bound events in the Zustand store
        return useEventStore.getState().getEvent(id);
    }

    static getAvailableEvents(category = null, state = GameState.state, timing = null) {
        const store = useEventStore.getState();
        const allEvents = [...(this.jsonEvents || []), ...store.eventPool];

        // Deduplicate events by ID to prevent legacy overlaps
        const uniqueEventsMap = new Map();
        allEvents.forEach(e => uniqueEventsMap.set(e.id, e));
        const uniqueEvents = Array.from(uniqueEventsMap.values());

        // ── CMS timeline overrides: events can be pinned to specific weeks + timing ──
        const timelineOverrides = useCmsStore.getState().getTimelineOverrides?.() || {};

        return uniqueEvents.filter((event) => {
            if (category && event.category !== category) return false;

            // Timeline override: if CMS pinned this event to a specific week, only allow it then
            const override = timelineOverrides[`evt_${event.id}`] || timelineOverrides[event.id];
            if (override != null) {
                // Normalize: could be { week, timing } or plain number (legacy)
                const oWeek = typeof override === 'number' ? override : override.week;
                const oTiming = typeof override === 'number' ? 'start' : (override.timing || 'start');
                if (oWeek !== state.week) return false;
                // If caller requested a specific timing, filter by it
                if (timing && oTiming !== timing) return false;
            } else if (timing && timing !== 'start') {
                // Events without timeline overrides only fire at 'start' by default
                return false;
            }

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

    /**
     * Check for an event pinned to a specific intra-week timing slot.
     * Used by Bloomberg Terminal to fire mid-week and end-of-week events.
     * @param {'start'|'mid'|'end'} timing - Which timing slot to check
     * @returns {object|null} The selected event, or null
     */
    static checkForTimedEvent(timing = 'start') {
        const state = GameState.state;
        if (!state) return null;

        // Get events available for this timing slot
        const eligible = this.getAvailableEvents(null, state, timing);
        if (eligible.length === 0) return null;

        // Weighted random selection (same pattern as checkForEvent)
        const totalWeight = eligible.reduce((sum, e) => sum + (e.weight || 1), 0);
        let roll = Math.random() * totalWeight;
        let selected = eligible[0];

        for (const event of eligible) {
            roll -= (event.weight || 1);
            if (roll <= 0) { selected = event; break; }
        }

        // Record it
        const store = useEventStore.getState();
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
     *
     * Supports multiple matching strategies:
     *   1. triggerEventId + triggerNodeId match → activate if choice comes from that node
     *   2. triggerEventId + triggerChoice label substring → activate on matching label
     *   3. triggerEventId + choiceIndex (legacy) → activate on specific index
     *
     * @param {string} eventId - The dialogue tree / event ID
     * @param {number} choiceIndex - Which choice was selected (index)
     * @param {string} choiceLabel - Text of the selected choice
     * @param {string} [nodeId] - Named node ID if using new dialogue tree format
     */
    static checkStorylineTrigger(eventId, choiceIndex, choiceLabel, nodeId) {
        const allStorylines = this.jsonStorylines || [];
        if (allStorylines.length === 0) return;

        const matching = allStorylines.filter(s => {
            // Must match the event/tree ID
            if (s.triggerEventId !== eventId) return false;

            // Named node matching (new system)
            if (s.triggerNodeId && nodeId) {
                if (s.triggerNodeId !== nodeId) return false;
                // If triggerChoice is null, any choice from this node activates
                if (s.triggerChoice === null) return true;
            }

            // Choice label substring matching
            if (s.triggerChoice && choiceLabel) {
                const normalizedLabel = choiceLabel.toLowerCase();
                const normalizedTrigger = s.triggerChoice.toLowerCase();
                if (normalizedLabel.includes(normalizedTrigger) || normalizedTrigger.includes(normalizedLabel)) {
                    return true;
                }
            }

            // Legacy: choiceIndex matching
            if (s.triggerChoiceIndex !== undefined && s.triggerChoiceIndex === choiceIndex) {
                return true;
            }

            return false;
        });

        if (matching.length === 0) return;

        // Sort by priority (higher = first)
        matching.sort((a, b) => (b.priority || 1) - (a.priority || 1));

        // Lazy import to avoid circular deps
        import('../stores/storylineStore.js').then(({ useStorylineStore }) => {
            const currentWeek = GameState.state?.week || 1;
            for (const storyline of matching) {
                useStorylineStore.getState().activateStoryline(
                    storyline.id, currentWeek, storyline
                );

                // Log to ActivityLogger
                ActivityLogger.logStoryline('arc_activated', {
                    storylineId: storyline.id,
                    title: storyline.title,
                    triggerEvent: eventId,
                    triggerNode: nodeId,
                    triggerChoice: choiceLabel,
                    totalSteps: storyline.steps?.length || 0,
                });

                console.log(`[EventRegistry] Activated storyline: "${storyline.title}" from ${eventId}/${nodeId}`);
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
