/**
 * InkBridge.js — Bridge between inkjs stories and the ArtLife dialogue system.
 *
 * Allows new dialogue trees to be authored in .ink format (compiled to JSON)
 * while existing DIALOGUE_TREES JSON trees continue working through DialogueEngine.
 *
 * Usage:
 *   import { InkBridge } from './InkBridge.js';
 *   const bridge = new InkBridge(compiledInkJson);
 *   bridge.syncFromGameState();  // push game vars → ink
 *   while (bridge.canContinue()) {
 *     const text = bridge.continue();
 *     const choices = bridge.getChoices();
 *     // render text + choices to UI
 *     bridge.selectChoice(playerChoiceIndex);
 *   }
 *   bridge.syncToGameState();  // pull ink var changes → game
 */

import { Story } from 'inkjs';
import { GameState } from './GameState.js';
import { useNPCStore } from '../stores/npcStore.js';

export class InkBridge {
    /**
     * @param {object} compiledJson - Compiled .ink story JSON
     */
    constructor(compiledJson) {
        this.story = new Story(compiledJson);
        this.paragraphs = [];   // accumulated text paragraphs
        this.toneChoices = [];  // track tone tags from choices
    }

    // ── Game State Sync ───────────────────────────────────────────────────

    /**
     * Push GameState variables into ink's variable store.
     * Ink scripts can reference these with: {cash}, {reputation}, etc.
     */
    syncFromGameState() {
        const s = GameState.state;
        if (!s) return;

        const vars = this.story.variablesState;

        // Core stats
        const mappings = {
            cash: s.cash,
            reputation: s.reputation,
            taste: s.taste,
            intel: s.intel,
            access: s.access,
            hype: s.hype,
            audacity: s.audacity,
            week: s.week,
            city: s.currentCity,
            character_name: s.name || 'Player',
            character_class: s.archetype || 'unknown',
            market_state: s.marketState,
            suspicion: s.suspicion,
            market_heat: s.marketHeat,
            burnout: s.burnout,
            portfolio_count: (s.portfolio || []).length,
        };

        for (const [key, value] of Object.entries(mappings)) {
            try { vars.$(key, value); }
            catch { /* variable not declared in ink — skip */ }
        }

        // NPC favor values
        const npcStore = useNPCStore.getState();
        (npcStore.contacts || []).forEach(contact => {
            try { vars.$(`favor_${contact.id}`, contact.favor || 0); }
            catch { /* skip */ }
        });
    }

    /**
     * Pull ink variable changes back into GameState.
     * Ink scripts can modify: ~ cash = cash - 500
     */
    syncToGameState() {
        const s = GameState.state;
        if (!s) return;

        const vars = this.story.variablesState;

        // Only sync numeric stats that ink might modify
        const syncable = ['cash', 'reputation', 'taste', 'intel', 'access', 'hype', 'audacity', 'suspicion', 'market_heat', 'burnout'];
        syncable.forEach(key => {
            try {
                const inkVal = vars.$(key);
                if (typeof inkVal === 'number' && inkVal !== s[key === 'market_heat' ? 'marketHeat' : key]) {
                    s[key === 'market_heat' ? 'marketHeat' : key] = inkVal;
                }
            }
            catch { /* skip */ }
        });
    }

    // ── Story Navigation ──────────────────────────────────────────────────

    /**
     * Check if the story has more text to output.
     */
    canContinue() {
        return this.story.canContinue;
    }

    /**
     * Get the next paragraph of text. Processes tags.
     * @returns {{ text: string, tags: string[] }}
     */
    continue() {
        const text = this.story.Continue().trim();
        const tags = this.story.currentTags || [];
        this.paragraphs.push({ text, tags });

        return { text, tags };
    }

    /**
     * Continue until we hit choices or end, collecting all text.
     * @returns {{ paragraphs: Array<{text, tags}>, choices: Array }}
     */
    continueToChoices() {
        while (this.story.canContinue) {
            this.continue();
        }
        return {
            paragraphs: [...this.paragraphs],
            choices: this.getChoices(),
        };
    }

    /**
     * Get current available choices.
     * Each choice may have tags for tone, stat requirements, etc.
     * @returns {Array<{ index: number, text: string, tone: string|null }>}
     */
    getChoices() {
        return this.story.currentChoices.map((choice, i) => {
            // Parse tone from choice text: "[friendly] That sounds great!"
            const toneMatch = choice.text.match(/^\[(\w+)\]\s*/);
            const tone = toneMatch ? toneMatch[1] : null;
            const cleanText = toneMatch ? choice.text.replace(toneMatch[0], '') : choice.text;

            return {
                index: i,
                text: cleanText,
                tone,
                rawText: choice.text,
            };
        });
    }

    /**
     * Select a choice by index. Records tone if present.
     * @param {number} index
     */
    selectChoice(index) {
        const choices = this.getChoices();
        if (choices[index]?.tone) {
            this.toneChoices.push(choices[index].tone);
        }

        this.story.ChooseChoiceIndex(index);
        this.paragraphs = []; // clear for next passage
    }

    /**
     * Check if the story has ended (no more text and no choices).
     */
    hasEnded() {
        return !this.story.canContinue && this.story.currentChoices.length === 0;
    }

    /**
     * Get all tone choices made during this conversation.
     */
    getToneChoices() {
        return [...this.toneChoices];
    }

    /**
     * Get the current story path for save/restore.
     */
    getState() {
        return this.story.state.toJson();
    }

    /**
     * Restore story state from saved JSON.
     */
    loadState(json) {
        this.story.state.LoadJson(json);
    }

    /**
     * Reset the story to the beginning.
     */
    reset() {
        this.story.ResetState();
        this.paragraphs = [];
        this.toneChoices = [];
    }
}
