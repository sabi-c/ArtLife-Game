import { GameState } from './GameState.js';
import { MarketManager } from './MarketManager.js';
import { generateId } from '../utils/id.js';

/**
 * DecisionLog — Sir Brante-style decision journal
 *
 * Tracks every significant player decision with full context:
 * what event, what choice, what stats the player had, what effects applied,
 * and tags for querying. Displayed in the Journal tab.
 */
export class DecisionLog {
    static entries = [];

    static reset() {
        DecisionLog.entries = [];
    }

    /**
     * Record a decision.
     * @param {object} decision
     * @param {string} decision.eventId - The event that triggered this decision
     * @param {string} decision.eventTitle - Human-readable event title
     * @param {number} decision.choiceIndex - Which choice was selected
     * @param {string} decision.choiceLabel - Text of the chosen option
     * @param {object} decision.effects - { cash: -25000, reputation: +5 }
     * @param {string[]} [decision.tags] - ['purchase', 'dealer', 'scandal']
     * @param {string} [decision.npcInvolved] - NPC id if relevant
     * @param {boolean} [decision.isBlueOption] - Was this a blue option?
     */
    static record(decision) {
        const state = GameState.state;

        DecisionLog.entries.push({
            id: generateId('dec'),
            week: state.week,
            eventId: decision.eventId,
            eventTitle: decision.eventTitle,
            choiceIndex: decision.choiceIndex,
            choiceLabel: decision.choiceLabel,
            isBlueOption: decision.isBlueOption || false,
            // Snapshot of player state at time of decision
            context: {
                cash: state.cash,
                reputation: state.reputation,
                intel: state.intel,
                portfolioValue: GameState.getPortfolioValue(),
                portfolioCount: state.portfolio.length,
                marketState: state.marketState,
                marketHeat: state.marketHeat,
                suspicion: state.suspicion,
            },
            effects: decision.effects || {},
            tags: decision.tags || [],
            npcInvolved: decision.npcInvolved || null,
        });
    }

    // ── Query methods ──

    static getAll() {
        return DecisionLog.entries;
    }

    static getByTag(tag) {
        return DecisionLog.entries.filter(e => e.tags?.includes(tag));
    }

    static getByNPC(npcId) {
        return DecisionLog.entries.filter(e => e.npcInvolved === npcId);
    }

    static getByWeekRange(start, end) {
        return DecisionLog.entries.filter(e => e.week >= start && e.week <= end);
    }

    static getRecent(count = 10) {
        return DecisionLog.entries.slice(-count);
    }

    /**
     * Get a formatted summary for the Journal tab.
     * Returns the most recent entries as display-ready objects.
     */
    static getJournalEntries(count = 15) {
        return DecisionLog.entries.slice(-count).reverse().map(entry => {
            // Format effects as a human-readable string
            const effectParts = [];
            if (entry.effects.cash) effectParts.push(`$${entry.effects.cash > 0 ? '+' : ''}${entry.effects.cash.toLocaleString()}`);
            if (entry.effects.reputation) effectParts.push(`Rep ${entry.effects.reputation > 0 ? '+' : ''}${entry.effects.reputation}`);
            if (entry.effects.intel) effectParts.push(`Intel ${entry.effects.intel > 0 ? '+' : ''}${entry.effects.intel}`);
            if (entry.effects.marketHeat) effectParts.push(`Heat ${entry.effects.marketHeat > 0 ? '+' : ''}${entry.effects.marketHeat}`);
            if (entry.effects.suspicion) effectParts.push(`Suspicion ${entry.effects.suspicion > 0 ? '+' : ''}${entry.effects.suspicion}`);

            return {
                week: entry.week,
                title: entry.eventTitle,
                choice: entry.choiceLabel,
                effectsSummary: effectParts.join(', ') || '—',
                isBlueOption: entry.isBlueOption,
                tags: entry.tags,
            };
        });
    }

    /**
     * Count decisions by tag — useful for stat evolution later.
     */
    static countByTag(tag) {
        return DecisionLog.entries.filter(e => e.tags?.includes(tag)).length;
    }
}
