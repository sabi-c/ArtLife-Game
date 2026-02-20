import { EVENTS } from '../data/events.js';
import { GameState } from './GameState.js';
import { QualityGate } from './QualityGate.js';

/**
 * Event manager — Oregon Trail-style pacing + Quality Gate filtering
 * Events fire almost every turn. The game IS the events.
 */
export class EventManager {
    static pendingEvent = null;
    static lastEventWeek = 0;
    static recentEventIds = []; // Track last N events to avoid repeats
    static priorityQueue = [];  // Events forced by ConsequenceScheduler

    static checkForEvent() {
        const state = GameState.state;

        // ── Priority queue: consequence-scheduled events fire first ──
        if (EventManager.priorityQueue.length > 0) {
            const eventId = EventManager.priorityQueue.shift();
            const event = EVENTS.find(e => e.id === eventId);
            if (event) {
                state.eventsTriggered.push(event.id);
                EventManager.lastEventWeek = state.week;
                EventManager.recentEventIds.push(event.id);
                if (EventManager.recentEventIds.length > 5) EventManager.recentEventIds.shift();
                return event;
            }
        }

        const weeksSinceLastEvent = state.week - EventManager.lastEventWeek;

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
        const eligible = EVENTS.filter((event) => {
            // Class restriction check
            if (event.classRestriction && event.classRestriction !== state.character.id) {
                return false;
            }

            // Don't repeat the last 5 events
            if (EventManager.recentEventIds.includes(event.id)) {
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
        EventManager.lastEventWeek = state.week;

        // Track recent events (keep last 5)
        EventManager.recentEventIds.push(selected.id);
        if (EventManager.recentEventIds.length > 5) {
            EventManager.recentEventIds.shift();
        }

        return selected;
    }

    static getPendingEvent() {
        const event = EventManager.pendingEvent;
        EventManager.pendingEvent = null;
        return event;
    }
}

