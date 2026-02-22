import { GameState } from './GameState.js';
import { PhoneManager } from './PhoneManager.js';
import { useEventStore } from '../stores/eventStore.js';
import { generateId } from '../utils/id.js';

// Atmospheric tease lines shown when a consequence is scheduled
const TEASE_LINES = {
    phone_message: [
        'You have a feeling your phone will ring soon...',
        'Someone will be in touch...',
        'This conversation isn\'t over.',
    ],
    stat_change: [
        'The consequences of your actions will become clear...',
        'Something shifts in the balance...',
        'This will leave a mark.',
    ],
    news: [
        'Word travels fast in this world...',
        'The art world has a long memory...',
        'People will talk about this.',
    ],
    event_unlock: [
        'You sense something on the horizon...',
        'Doors are opening — or closing.',
        'This changes things.',
    ],
    scene: [
        'You\'ll be hearing from them...',
        'Something is being set in motion.',
        'The wheels are turning.',
    ],
    default: [
        'This isn\'t over.',
        'You have a feeling about this...',
        'Time will tell.',
    ],
};

/**
 * ConsequenceScheduler — King of Dragon Pass-style delayed consequences
 *
 * Decisions today trigger phone messages, events, stat changes, and news
 * items weeks later. Each consequence can have a runtime condition that
 * must be true at trigger time.
 */
export class ConsequenceScheduler {
    static queue = [];

    static reset() {
        ConsequenceScheduler.queue = [];
    }

    /**
     * Schedule a future consequence.
     * @param {object} consequence
     * @param {number} consequence.triggerWeek - The game week when this fires
     * @param {string} consequence.type - 'phone_message' | 'stat_change' | 'news' | 'event_unlock'
     * @param {object} consequence.payload - Type-specific data
     * @param {function} [consequence.condition] - Optional runtime check; consequence only fires if this returns true
     * @param {string} [consequence.sourceEvent] - The event ID that caused this (for Decision Journal linking)
     */
    static add(consequence) {
        ConsequenceScheduler.queue.push({
            id: generateId('csq'),
            triggerWeek: consequence.triggerWeek,
            type: consequence.type,
            payload: consequence.payload,
            condition: consequence.condition || null,
            sourceEvent: consequence.sourceEvent || null,
            fired: false,
        });

        // Show atmospheric tease if requested
        if (consequence.tease !== false) {
            const teaseText = consequence.teaseText || ConsequenceScheduler.getTeaseText(consequence.type);
            if (teaseText) {
                GameState.addNews(teaseText);
            }
        }
    }

    /**
     * Get a random atmospheric tease line for a consequence type.
     * @param {string} type
     * @returns {string}
     */
    static getTeaseText(type) {
        const lines = TEASE_LINES[type] || TEASE_LINES.default;
        return lines[Math.floor(Math.random() * lines.length)];
    }

    /**
     * Shortcut: schedule a consequence relative to the current week.
     * @param {number} weeksFromNow - How many weeks until trigger
     * @param {string} type - Consequence type
     * @param {object} payload - Consequence data
     * @param {object} [options] - Optional condition, sourceEvent
     */
    static addRelative(weeksFromNow, type, payload, options = {}) {
        const currentWeek = GameState.state.week;
        ConsequenceScheduler.add({
            triggerWeek: currentWeek + weeksFromNow,
            type,
            payload,
            condition: options.condition || null,
            sourceEvent: options.sourceEvent || null,
        });
    }

    /**
     * Called every advanceWeek(). Fires all due consequences whose conditions are met.
     * @param {number} currentWeek
     */
    static tick(currentWeek) {
        const due = ConsequenceScheduler.queue.filter(c =>
            !c.fired && c.triggerWeek <= currentWeek
        );

        due.forEach(c => {
            // Check runtime condition
            if (c.condition && typeof c.condition === 'function') {
                if (!c.condition()) return; // Condition not met — leave unfired but don't block
            }

            c.fired = true;
            ConsequenceScheduler.execute(c);
        });

        // Clean up old fired consequences (keep last 20 for journal reference)
        const fired = ConsequenceScheduler.queue.filter(c => c.fired);
        if (fired.length > 20) {
            ConsequenceScheduler.queue = [
                ...ConsequenceScheduler.queue.filter(c => !c.fired),
                ...fired.slice(-20),
            ];
        }
    }

    /**
     * Execute a single consequence.
     */
    static execute(consequence) {
        const { type, payload } = consequence;

        switch (type) {
            case 'phone_message':
                PhoneManager.sendMessage({
                    from: payload.from || 'system',
                    subject: payload.subject,
                    body: payload.body,
                    urgency: payload.urgency || 'normal',
                    category: payload.category || 'personal',
                    actions: payload.actions || null,
                });
                break;

            case 'stat_change':
                // payload is an effects object: { cash: -5000, reputation: 3 }
                GameState.applyEffects(payload);
                break;

            case 'news':
                // payload is a string or { text }
                const newsText = typeof payload === 'string' ? payload : payload.text;
                GameState.addNews(newsText);
                break;

            case 'scene':
                // payload is { sceneId }
                GameState.state.pendingScene = payload.sceneId;
                break;

            case 'event_unlock':
                // Push an event ID into the EventStore's priority queue
                // that EventRegistry checks first on the next turn
                useEventStore.getState().addPriorityEvent(payload.eventId);
                GameState.addNews(`System: Scheduled event ${payload.eventId} prioritized.`);
                break;

            default:
                console.warn(`[ConsequenceScheduler] Unknown type: ${type}`);
        }
    }

    /**
     * Remove a specific pending consequence from the queue.
     * Used when the player manually attends a scheduled scene from the dashboard.
     */
    static removePending(consequence) {
        const idx = ConsequenceScheduler.queue.indexOf(consequence);
        if (idx !== -1) {
            ConsequenceScheduler.queue.splice(idx, 1);
        } else {
            // Fallback: match by id if reference doesn't match
            const idxById = ConsequenceScheduler.queue.findIndex(c => c.id === consequence.id);
            if (idxById !== -1) {
                ConsequenceScheduler.queue.splice(idxById, 1);
            }
        }
    }

    /**
     * Get all pending (unfired) consequences for debug/journal display.
     */
    static getPending() {
        return ConsequenceScheduler.queue.filter(c => !c.fired);
    }

    /**
     * Get recently fired consequences for journal display.
     */
    static getRecent(count = 5) {
        return ConsequenceScheduler.queue
            .filter(c => c.fired)
            .slice(-count);
    }
}
