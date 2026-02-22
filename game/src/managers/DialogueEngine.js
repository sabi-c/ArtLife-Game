/**
 * DialogueEngine.js
 * Full dialogue engine with tone tracking, condition evaluation,
 * effect application, and branching navigation.
 *
 * Replaces the original 75-line stub. Works with both JSON dialogue trees
 * (from dialogue_trees.js) and registered scene definitions.
 */

import { GameState } from './GameState.js';
import { QualityGate } from './QualityGate.js';
import { DIALOGUE_TREES, TONES, TONE_SPECIALIZATIONS } from '../data/dialogue_trees.js';
import { useNPCStore } from '../stores/npcStore.js';
import { useInventoryStore } from '../stores/inventoryStore.js';

// ─── Tone Constants ──────────────────────────────────────────────────────────

export const TONE_IDS = TONES.map(t => t.id);

// ─── Engine ──────────────────────────────────────────────────────────────────

class DialogueEngineManager {
    constructor() {
        this.reset();
    }

    // ── State ────────────────────────────────────────────────────────────────

    reset() {
        this.currentTree = null;
        this.currentNodeId = null;
        this.history = [];          // breadcrumb trail for back navigation
        this.toneStack = [];        // tone choices made in THIS conversation
        this.conversationNpcId = null;
        this.ended = false;

        // Legacy scene-based system (kept for backward compat)
        this.scenes = {};
    }

    // ── Legacy Scene Registration (backward compat) ─────────────────────────

    registerScene(sceneDef) {
        this.scenes[sceneDef.id] = sceneDef;
    }

    startScene(sceneId) {
        if (!this.scenes[sceneId]) {
            console.error(`[DialogueEngine] Scene '${sceneId}' not found.`);
            return false;
        }
        this.currentTree = null;
        this.currentNodeId = 'start';
        this._legacyScene = this.scenes[sceneId];
        this.ended = false;
        return true;
    }

    // ── Tree-Based Dialogue ─────────────────────────────────────────────────

    /**
     * Load and start a dialogue tree by ID.
     * @param {string} treeId - ID from DIALOGUE_TREES
     * @param {string} [startNode='start'] - node to begin at
     * @returns {boolean} true if tree loaded successfully
     */
    loadTree(treeId, startNode = 'start') {
        const tree = DIALOGUE_TREES.find(t => t.id === treeId);
        if (!tree) {
            console.warn(`[DialogueEngine] Tree '${treeId}' not found.`);
            return false;
        }

        this.reset();
        this.currentTree = tree;
        this.currentNodeId = startNode;
        this.conversationNpcId = tree.npcId || null;
        this.ended = false;
        return true;
    }

    /**
     * Get the current node, resolving text variants based on game state.
     * @returns {Object|null} { speaker, text, topics, effects, ... }
     */
    getCurrentNode() {
        // Legacy scene path
        if (this._legacyScene) {
            return this._legacyScene.nodes?.[this.currentNodeId] || null;
        }

        if (!this.currentTree || !this.currentNodeId) return null;
        const node = this.currentTree.nodes[this.currentNodeId];
        if (!node) return null;

        // Resolve variant text
        let resolvedText = node.text;
        if (node.variants && Array.isArray(node.variants)) {
            resolvedText = this._resolveVariant(node.variants) || resolvedText;
        }

        return {
            ...node,
            text: this._interpolate(resolvedText),
            availableTopics: this.getAvailableTopics(node),
        };
    }

    /**
     * Get filtered topics that the player qualifies for.
     */
    getAvailableTopics(node) {
        if (!node?.topics) return [];
        const state = GameState.state;
        if (!state) return node.topics;

        return node.topics.map(topic => {
            const locked = topic.requires ? !this._meetsRequirements(topic.requires) : false;
            return { ...topic, locked };
        });
    }

    /**
     * Select a topic/choice by index. Applies effects and advances to next node.
     * @param {number} index - index into current node's topics array
     * @returns {boolean} true if conversation continues, false if ended
     */
    selectChoice(index) {
        // Legacy scene path
        if (this._legacyScene) {
            return this._legacyMakeChoice(index);
        }

        const node = this.currentTree?.nodes[this.currentNodeId];
        if (!node?.topics || !node.topics[index]) return false;

        const topic = node.topics[index];

        // Track tone
        if (topic.tone) {
            this.trackTone(topic.tone);
        }

        // Apply effects
        if (topic.effects) {
            this.applyEffects(topic.effects);
        }

        // Apply NPC effects
        if (topic.npcEffects) {
            this._applyNPCEffects(topic.npcEffects);
        }

        // Grant items
        if (topic.grantItems) {
            topic.grantItems.forEach(item => {
                useInventoryStore.getState().addItem(item);
            });
        }

        // Record in history
        this.history.push({
            nodeId: this.currentNodeId,
            choiceIndex: index,
            tone: topic.tone,
            label: topic.label,
        });

        // Navigate
        if (!topic.next || topic.next === 'end') {
            this.ended = true;
            return false;
        }

        this.currentNodeId = topic.next;
        return true;
    }

    /**
     * Go back one step in conversation history.
     * @returns {boolean} true if successfully went back
     */
    goBack() {
        if (this.history.length === 0) return false;
        const prev = this.history.pop();
        this.currentNodeId = prev.nodeId;
        this.ended = false;
        return true;
    }

    // ── Tone System ─────────────────────────────────────────────────────────

    /**
     * Record a tone choice.
     */
    trackTone(toneId) {
        if (TONE_IDS.includes(toneId)) {
            this.toneStack.push(toneId);
        }
    }

    /**
     * Get the dominant tone across all conversations (stored in GameState).
     * Used for Week 20 specialization.
     */
    static getDominantTone() {
        const allTones = GameState.state?.toneHistory || [];
        if (allTones.length === 0) return null;

        const counts = {};
        allTones.forEach(t => { counts[t] = (counts[t] || 0) + 1; });

        let maxTone = null;
        let maxCount = 0;
        for (const [tone, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxTone = tone;
                maxCount = count;
            }
        }
        return maxTone;
    }

    /**
     * Get specialization for current dominant tone (if Week >= 20).
     */
    static getSpecialization() {
        const state = GameState.state;
        if (!state || state.week < 20) return null;
        if (state.toneSpecialization) return state.toneSpecialization;

        const dominant = DialogueEngineManager.getDominantTone();
        if (!dominant) return null;

        const spec = TONE_SPECIALIZATIONS[dominant];
        if (spec) {
            state.toneSpecialization = { tone: dominant, ...spec };
        }
        return state.toneSpecialization || null;
    }

    /**
     * Flush conversation tones into persistent GameState toneHistory.
     * Called when a conversation ends.
     */
    flushTones() {
        if (this.toneStack.length === 0) return;
        const state = GameState.state;
        if (!state) return;

        if (!state.toneHistory) state.toneHistory = [];
        state.toneHistory.push(...this.toneStack);

        // Keep last 100 tone entries
        if (state.toneHistory.length > 100) {
            state.toneHistory = state.toneHistory.slice(-100);
        }
    }

    // ── Effects ──────────────────────────────────────────────────────────────

    /**
     * Apply stat/resource effects to GameState.
     */
    applyEffects(effects) {
        if (!effects || !GameState.state) return;
        GameState.applyEffects(effects);
    }

    /**
     * Apply NPC-specific effects (favor changes, grudges, etc.).
     */
    _applyNPCEffects(npcEffects) {
        const npcStore = useNPCStore.getState();
        for (const [npcId, effects] of Object.entries(npcEffects)) {
            if (effects.favor) {
                npcStore.adjustFavor(npcId, effects.favor);
            }
            if (effects.grudge) {
                npcStore.addGrudge(npcId, effects.grudge);
            }
            if (effects.witnessed) {
                npcStore.addWitnessed(npcId, effects.witnessed);
            }
        }
    }

    // ── Condition Evaluation ─────────────────────────────────────────────────

    /**
     * Check if player meets requirements for a topic/node.
     * @param {Object} requires - { stat: { min: N }, cash: { min: N }, flag: true, ... }
     */
    _meetsRequirements(requires) {
        const state = GameState.state;
        if (!state) return false;

        for (const [key, condition] of Object.entries(requires)) {
            // NPC favor check: 'npcFavor.elena_ross': { min: 10 }
            if (key.startsWith('npcFavor.')) {
                const npcId = key.split('.')[1];
                const npcStore = useNPCStore.getState();
                const contact = npcStore.contacts?.find(c => c.id === npcId);
                const favor = contact?.favor || 0;
                if (condition.min !== undefined && favor < condition.min) return false;
                continue;
            }

            // Flag check: 'attended.gallery_opening': true
            if (key.startsWith('attended.') || key.startsWith('flag.')) {
                const flagKey = key.split('.')[1];
                if (condition === true && !state.flags?.[flagKey]) return false;
                if (condition === false && state.flags?.[flagKey]) return false;
                continue;
            }

            // Stat check: { min: N } or { max: N }
            const value = state[key];
            if (value === undefined) continue;
            if (condition.min !== undefined && value < condition.min) return false;
            if (condition.max !== undefined && value > condition.max) return false;
        }

        return true;
    }

    /**
     * Resolve the best matching text variant for a node.
     */
    _resolveVariant(variants) {
        // Check from first to last; first match wins (most specific first)
        for (const variant of variants) {
            if (!variant.check) {
                return variant.text; // Default/fallback variant
            }
            if (this._meetsRequirements(variant.check)) {
                return variant.text;
            }
        }
        return null;
    }

    // ── Variable Text Interpolation ─────────────────────────────────────────

    /**
     * Replace {variable} placeholders in text with live game state values.
     * Supports: {cash}, {reputation}, {name}, {city}, {week},
     * {last_purchased_art}, {portfolio_count}, {market_state}, etc.
     * @param {string} text
     * @returns {string}
     */
    _interpolate(text) {
        if (!text || !text.includes('{')) return text;
        const s = GameState.state;
        if (!s) return text;

        const lastPurchase = (s.portfolio || []).slice(-1)[0];

        // NPC memory context (if in a conversation with a specific NPC)
        const npcStore = useNPCStore.getState();
        const npc = this.conversationNpcId
            ? npcStore.contacts?.find(c => c.id === this.conversationNpcId)
            : null;
        const npcMemory = npc?.memory || { witnessed: [], grudges: [], favors: [] };

        const vars = {
            cash: `$${(s.cash || 0).toLocaleString()}`,
            reputation: s.reputation || 0,
            taste: s.taste || 0,
            intel: s.intel || 0,
            access: s.access || 0,
            hype: s.hype || 0,
            audacity: s.audacity || 0,
            name: s.name || 'Player',
            city: s.currentCity || 'New York',
            week: s.week || 1,
            market_state: s.marketState || 'flat',
            suspicion: s.suspicion || 0,
            market_heat: s.marketHeat || 0,
            burnout: s.burnout || 0,
            portfolio_count: (s.portfolio || []).length,
            net_worth: `$${((s.cash || 0) + (s.portfolio || []).reduce((sum, w) => sum + (w.price || w.basePrice || 0), 0)).toLocaleString()}`,
            last_purchased_art: lastPurchase?.title || 'nothing yet',
            last_purchased_price: lastPurchase ? `$${(lastPurchase.purchasePrice || lastPurchase.price || 0).toLocaleString()}` : '$0',
            last_purchased_artist: lastPurchase?.artist || 'nobody',
            archetype: s.archetype || 'dealer',
            // NPC-specific vars
            npc: npc?.name || this.conversationNpcId || 'someone',
            npc_favor: npc?.favor || 0,
            npc_grudge_count: npcMemory.grudges.length,
            npc_favor_count: npcMemory.favors.length,
            npc_last_grudge: npcMemory.grudges.length > 0
                ? npcMemory.grudges[npcMemory.grudges.length - 1].reason || 'something'
                : 'nothing',
            npc_relationship: !npc ? 'stranger'
                : (npc.favor || 0) >= 20 ? 'friend'
                : (npc.favor || 0) >= 5 ? 'acquaintance'
                : (npc.favor || 0) <= -10 ? 'enemy'
                : (npc.favor || 0) < 0 ? 'suspicious'
                : 'neutral',
        };

        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return vars[key] !== undefined ? String(vars[key]) : match;
        });
    }

    // ── Legacy Compat ────────────────────────────────────────────────────────

    _legacyMakeChoice(choiceIndex) {
        const scene = this._legacyScene;
        if (!scene) return false;
        const node = scene.nodes?.[this.currentNodeId];
        if (!node?.choices?.[choiceIndex]) return false;

        const choice = node.choices[choiceIndex];
        if (choice.effect) choice.effect(GameState.state);

        if (!choice.next || choice.next === 'end') {
            this.endScene();
            return false;
        }
        this.currentNodeId = choice.next;
        return true;
    }

    endScene() {
        this.flushTones();
        this._legacyScene = null;
        this.currentTree = null;
        this.currentNodeId = null;
        this.ended = true;
    }
}

export const DialogueEngine = new DialogueEngineManager();
