import { GameState } from './GameState.js';
import { PhoneManager } from './PhoneManager.js';

/**
 * QualityGate — Fallen London-style quality checker
 *
 * Checks requirements objects against GameState.state.
 * Supports: min, max, equals, dotted paths (e.g. 'npcFavor.elena_ross')
 *
 * Used by: EventManager (event eligibility), DialogueScene (choice visibility),
 *          ConsequenceScheduler (conditional triggers)
 */
export class QualityGate {

    /**
     * Check if the player meets ALL requirements.
     * @param {object} requirements - e.g. { reputation: { min: 60 }, 'npcFavor.elena_ross': { min: 10 } }
     * @returns {boolean}
     */
    static check(requirements) {
        if (!requirements) return true;

        for (const [key, condition] of Object.entries(requirements)) {
            const value = QualityGate.resolve(key);

            if (typeof condition === 'object' && condition !== null) {
                if (condition.min !== undefined && (value === undefined || value < condition.min)) return false;
                if (condition.max !== undefined && (value === undefined || value > condition.max)) return false;
                if (condition.equals !== undefined && value !== condition.equals) return false;
                if (condition.not !== undefined && value === condition.not) return false;
            } else {
                // Simple equality check
                if (value !== condition) return false;
            }
        }
        return true;
    }

    /**
     * Check requirements and return detailed results for UI display.
     * @param {object} requirements
     * @returns {{ met: boolean, details: Array<{ key, label, met, current, needed }> }}
     */
    static checkDetailed(requirements) {
        if (!requirements) return { met: true, details: [] };

        const details = [];
        let allMet = true;

        for (const [key, condition] of Object.entries(requirements)) {
            const value = QualityGate.resolve(key);
            const label = QualityGate.getLabel(key);
            let met = true;
            let needed = '';

            if (typeof condition === 'object' && condition !== null) {
                if (condition.min !== undefined && (value === undefined || value < condition.min)) {
                    met = false;
                    needed = `${condition.min}+`;
                }
                if (condition.max !== undefined && (value === undefined || value > condition.max)) {
                    met = false;
                    needed = `≤${condition.max}`;
                }
                if (condition.equals !== undefined && value !== condition.equals) {
                    met = false;
                    needed = `${condition.equals}`;
                }
            } else {
                if (value !== condition) {
                    met = false;
                    needed = `${condition}`;
                }
            }

            if (!met) allMet = false;
            details.push({ key, label, met, current: value, needed });
        }

        return { met: allMet, details };
    }

    /**
     * Resolve a dotted path against GameState.state + PhoneManager.
     * Supports: 'reputation', 'cash', 'npcFavor.elena_ross', 'portfolioValue', etc.
     */
    static resolve(key) {
        const state = GameState.state;

        // Special computed qualities
        if (key === 'portfolioValue') return GameState.getPortfolioValue();
        if (key === 'portfolioCount') return state.portfolio.length;
        if (key === 'totalWorksBought') return state.totalWorksBought;
        if (key === 'totalWorksSold') return state.totalWorksSold;

        // NPC favor via PhoneManager
        if (key.startsWith('npcFavor.')) {
            const npcId = key.split('.')[1];
            const contact = PhoneManager.getContact(npcId);
            return contact ? contact.favor : 0;
        }

        // Event attendance flags (check eventsTriggered)
        if (key.startsWith('attended.')) {
            const eventId = key.split('.')[1];
            return state.eventsTriggered.includes(eventId);
        }

        // Direct state property
        if (key in state) return state[key];

        // Dotted path traversal
        const parts = key.split('.');
        let value = state;
        for (const part of parts) {
            value = value?.[part];
        }
        return value;
    }

    /**
     * Get a human-readable label for a quality key.
     */
    static getLabel(key) {
        const labels = {
            reputation: 'Reputation',
            cash: 'Cash',
            intel: 'Intel',
            marketHeat: 'Market Heat',
            suspicion: 'Suspicion',
            burnout: 'Burnout',
            portfolioValue: 'Portfolio Value',
            portfolioCount: 'Works Owned',
            totalWorksBought: 'Works Bought',
            totalWorksSold: 'Works Sold',
            dealerBlacklisted: 'Blacklisted',
            week: 'Week',
        };

        if (key.startsWith('npcFavor.')) {
            const npcId = key.split('.')[1];
            const contactData = PhoneManager.getContactData(npcId);
            return contactData ? `Favor: ${contactData.name}` : `NPC Favor`;
        }

        if (key.startsWith('attended.')) {
            return `Attended event`;
        }

        if (key.startsWith('flags.')) {
            return `Intel: ${key.split('.')[1].replace(/_/g, ' ')}`;
        }

        return labels[key] || key;
    }
}
