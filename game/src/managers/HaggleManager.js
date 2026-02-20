/**
 * HaggleManager.js — State machine for Pokémon-style art negotiation battles
 * 
 * Manages turn-based haggle rounds, tactic resolution, dealer AI responses,
 * and price convergence. Works with both buying and selling scenarios.
 */

import { DEALER_TYPES, TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, ROLE_TO_DEALER_TYPE, HAGGLE_CONFIG, HAGGLE_TYPES, TYPE_EFFECTIVENESS } from '../data/haggle_config.js';
import { GameState } from './GameState.js';

class _HaggleManager {
    constructor() {
        this.active = null; // Current haggle state, or null
    }

    // ════════════════════════════════════════════
    // Start a new haggle
    // ════════════════════════════════════════════

    /**
     * @param {Object} params
     * @param {string} params.mode — 'buy' or 'sell'
     * @param {Object} params.work — the artwork being negotiated
     * @param {Object} params.npc — the NPC contact (from contacts.js), or null for anonymous
     * @param {number} params.askingPrice — the starting asking price
     * @param {number} params.playerOffer — the player's opening offer (optional, defaults to 70% of ask)
     */
    start({ mode, work, npc, askingPrice, playerOffer }) {
        const s = GameState.state;

        // Determine dealer type from NPC role, or random
        const dealerTypeKey = npc
            ? (ROLE_TO_DEALER_TYPE[npc.role] || 'patron')
            : this._randomDealerType();
        const dealerType = DEALER_TYPES[dealerTypeKey];

        // Adjusted asking price based on dealer greed
        const adjustedAsk = Math.round(askingPrice * dealerType.greedFactor);

        // Player's opening offer
        const opening = playerOffer || Math.round(adjustedAsk * 0.7);

        // Calculate initial gap
        const gap = adjustedAsk - opening;

        this.active = {
            mode,                    // 'buy' or 'sell'
            work,                    // Artwork object
            npc,                     // NPC contact or null
            dealerTypeKey,
            dealerType,
            dealerName: npc ? npc.name : 'The Dealer',
            dealerIcon: dealerType.icon,

            askingPrice: adjustedAsk,
            currentOffer: opening,
            gap,

            round: 0,
            maxRounds: HAGGLE_CONFIG.maxRounds,
            patience: dealerType.patience,

            // History for display
            rounds: [],

            // Result
            resolved: false,
            result: null,           // 'deal' | 'walkaway' | 'timeout'
            finalPrice: null,

            // Player stats snapshot for formula calculations
            playerStats: {
                reputation: s.reputation || 0,
                taste: s.taste || 0,
                access: s.access || 0,
                intel: s.intel || 0,
                cash: s.cash || 0,
                suspicion: s.suspicion || 0,
                marketHeat: s.marketHeat || 0,
            },
        };

        return {
            dealerName: this.active.dealerName,
            dealerType: dealerType.name,
            dealerIcon: dealerType.icon,
            askingPrice: adjustedAsk,
            playerOffer: opening,
            openingDialogue: this._getDialogue('opening'),
        };
    }

    // ════════════════════════════════════════════
    // Get available tactics for current round
    // ════════════════════════════════════════════

    getAvailableTactics() {
        if (!this.active) return [];
        const s = this.active.playerStats;
        const tactics = [];

        // Base tactics
        for (const [key, tactic] of Object.entries(TACTICS)) {
            const locked = tactic.unlockStat && s[tactic.unlockStat] < tactic.unlockMin;
            tactics.push({
                ...tactic,
                locked,
                lockReason: locked ? `Requires ${tactic.unlockStat} ≥ ${tactic.unlockMin} (you have ${s[tactic.unlockStat]})` : null,
            });
        }

        // Blue options (stat-gated)
        for (const blue of BLUE_OPTIONS) {
            const hasReq = s[blue.requiredStat] >= blue.requiredMin;
            tactics.push({
                id: blue.id,
                label: blue.label,
                description: blue.description,
                isBlueOption: true,
                locked: !hasReq,
                lockReason: !hasReq ? `Requires ${blue.requiredStat} ≥ ${blue.requiredMin} (you have ${s[blue.requiredStat]})` : null,
                baseSuccess: blue.baseSuccess,
                priceShift: blue.priceShift,
                patienceEffect: blue.patienceEffect,
                heatGain: blue.heatGain,
                suspicionGain: blue.suspicionGain,
                dialogue: blue.dialogue,
            });
        }

        return tactics;
    }

    // ════════════════════════════════════════════
    // Helper: Get Type Effectiveness Multiplier
    // ════════════════════════════════════════════
    _getTypeEffectiveness(tacticType, dealerStyle) {
        if (!tacticType || !dealerStyle) return 1.0;

        const typeData = TYPE_EFFECTIVENESS[tacticType];
        if (!typeData) return 1.0;

        if (typeData.strongAgainst === dealerStyle) return 1.5; // Super Effective
        if (typeData.weakAgainst === dealerStyle) return 0.5;   // Not very effective

        return 1.0; // Neutral
    }

    // ════════════════════════════════════════════
    // Execute a tactic
    // ════════════════════════════════════════════

    /**
     * @param {string} tacticId — ID of the tactic to use
     * @returns {Object} Round result with dialogue, price changes, and state
     */
    executeTactic(tacticId) {
        if (!this.active || this.active.resolved) return null;

        const h = this.active;
        h.round++;

        // Find the tactic
        const allTactics = this.getAvailableTactics();
        const tactic = allTactics.find(t => t.id === tacticId);
        if (!tactic || tactic.locked) return null;

        // ── Calculate success ──
        let successChance = tactic.baseSuccess;

        // Stat bonus — check both base TACTICS and BLUE_OPTIONS dictionaries
        const tacticDef = TACTICS[tacticId] || BLUE_OPTIONS.find(b => b.id === tacticId);
        if (tactic.statBonus && tacticDef) {
            const statVal = h.playerStats[tactic.statBonus] || 0;
            successChance += statVal * (tactic.statWeight || 0);
        }

        // Dealer weakness/strength modifier
        if (h.dealerType.weakTo === tacticId) {
            successChance += 0.2;
        }
        if (h.dealerType.strongAgainst === tacticId) {
            successChance -= 0.15;
        }

        // Blue option bonus against collector-type dealers
        if (tactic.isBlueOption && h.dealerTypeKey === 'collector') {
            successChance += 0.15;
        }

        // ── Type Effectiveness System ──
        let effectivenessMult = 1.0;
        let effectivenessMessage = null;

        if (tactic.type && h.dealerType.haggleStyle) {
            effectivenessMult = this._getTypeEffectiveness(tactic.type, h.dealerType.haggleStyle);

            if (effectivenessMult > 1.0) {
                effectivenessMessage = 'It\'s super effective!';
                successChance += 0.20; // Big boost to success chance
            } else if (effectivenessMult < 1.0) {
                effectivenessMessage = 'It\'s not very effective...';
                successChance -= 0.15; // Penalty to success chance
            }
        }

        // Suspicion penalty
        successChance -= h.playerStats.suspicion * HAGGLE_CONFIG.suspicionPenalty;

        // Heat penalty
        successChance -= h.playerStats.marketHeat * HAGGLE_CONFIG.heatMemory;

        // Clamp
        successChance = Math.max(0.05, Math.min(0.95, successChance));

        // ── Roll ──
        const roll = Math.random();
        const success = roll < successChance;

        // ── Apply effects ──
        let priceChange = 0;
        let patienceChange = tactic.patienceEffect || 0;

        if (success) {
            // Price moves in player's favor, multiplied by effectiveness if it's a good move
            let actualPriceShift = tactic.priceShift;
            if (effectivenessMult > 1.0) actualPriceShift *= 1.5; // 50% more shift if super effective
            else if (effectivenessMult < 1.0) actualPriceShift *= 0.5; // 50% less shift if not very effective

            priceChange = Math.round(h.askingPrice * Math.abs(actualPriceShift));
            if (h.mode === 'buy') {
                h.currentOffer = h.currentOffer; // Player's offer stays
                h.askingPrice = Math.max(h.currentOffer, h.askingPrice - priceChange);
            } else {
                h.currentOffer = Math.min(h.askingPrice, h.currentOffer + priceChange);
            }
        } else {
            // Price moves against player or stays
            if (tacticId === 'raise') {
                // Raise always increases player's offer even on "failure"
                priceChange = Math.round(h.askingPrice * tactic.priceShift);
                h.currentOffer = Math.min(h.askingPrice, h.currentOffer + priceChange);
            }
            patienceChange = Math.min(patienceChange, -1); // Failed tactics always cost patience
        }

        h.patience = Math.max(0, h.patience + patienceChange);
        h.gap = h.askingPrice - h.currentOffer;

        // Heat and suspicion effects
        if (tactic.heatGain) GameState.state.marketHeat = Math.min(100, (GameState.state.marketHeat || 0) + tactic.heatGain);
        if (tactic.suspicionGain) GameState.state.suspicion = Math.min(100, (GameState.state.suspicion || 0) + tactic.suspicionGain);

        // ── Get dealer dialogue ──
        let dialogueKey;
        if (tactic.isBlueOption) {
            dialogueKey = 'onBlueOption';
        } else {
            const keyMap = { raise: 'onRaise', holdFirm: 'onHoldFirm', walkAway: 'onWalkAway', bluff: 'onBluff' };
            dialogueKey = keyMap[tacticId] || 'onRaise';
        }
        const dialogue = this._getDialogue(dialogueKey);

        // ── Check for resolution ──
        let dealReached = false;
        let dealFailed = false;

        // Deal: gap is ≤ 5% of asking price
        if (h.gap <= h.askingPrice * 0.05) {
            dealReached = true;
        }

        // Failure conditions
        if (h.patience <= 0) {
            dealFailed = true;
        }
        if (tacticId === 'walkAway' && !success) {
            // They let you walk — deal fails
            dealFailed = true;
        }
        if (h.round >= h.maxRounds) {
            // Time out — close at current price if gap is small, otherwise fail
            if (h.gap <= h.askingPrice * 0.15) {
                dealReached = true;
            } else {
                dealFailed = true;
            }
        }

        // Build round record
        const roundResult = {
            round: h.round,
            tacticId,
            tacticLabel: tactic.label,
            success,
            successChance: Math.round(successChance * 100),
            priceChange,
            dialogue,
            playerOffer: h.currentOffer,
            askingPrice: h.askingPrice,
            gap: h.gap,
            patience: h.patience,
            dealReached,
            dealFailed,
            isBlueOption: tactic.isBlueOption || false,
            tacticType: tactic.type,
            effectivenessMult,
            effectivenessMessage,
        };

        h.rounds.push(roundResult);

        // ── Resolve if needed ──
        if (dealReached) {
            h.resolved = true;
            h.result = 'deal';
            h.finalPrice = Math.round((h.currentOffer + h.askingPrice) / 2); // Split the difference
            roundResult.finalDialogue = this._getDialogue('onDeal');
            roundResult.finalPrice = h.finalPrice;
        } else if (dealFailed) {
            h.resolved = true;
            h.result = 'walkaway';
            roundResult.finalDialogue = this._getDialogue('onFail');
        }

        return roundResult;
    }

    // ════════════════════════════════════════════
    // Get current haggle state (for screen rendering)
    // ════════════════════════════════════════════

    getState() {
        if (!this.active) return null;
        const h = this.active;
        return {
            mode: h.mode,
            work: h.work,
            dealerName: h.dealerName,
            dealerIcon: h.dealerIcon,
            dealerType: h.dealerType.name,
            dealerTypeKey: h.dealerTypeKey,
            askingPrice: h.askingPrice,
            currentOffer: h.currentOffer,
            gap: h.gap,
            round: h.round,
            maxRounds: h.maxRounds,
            patience: h.patience,
            maxPatience: h.dealerType.patience,
            rounds: h.rounds,
            resolved: h.resolved,
            result: h.result,
            finalPrice: h.finalPrice,
        };
    }

    // ════════════════════════════════════════════
    // Apply deal result to GameState
    // ════════════════════════════════════════════

    applyResult() {
        if (!this.active || !this.active.resolved) return null;
        const h = this.active;

        if (h.result === 'deal') {
            if (h.mode === 'buy') {
                // Buy: deduct cash, add to portfolio with full provenance record
                GameState.state.cash -= h.finalPrice;
                const acquiredWork = {
                    ...h.work,
                    onMarket: false,
                    purchasePrice: h.finalPrice,
                    purchaseWeek: GameState.state.week,
                    purchaseCity: GameState.state.currentCity,
                    storage: 'home',
                    insured: false,
                    provenance: [{
                        type: 'acquired (haggle)',
                        week: GameState.state.week,
                        city: GameState.state.currentCity,
                        price: h.finalPrice,
                        source: h.dealerName,
                    }],
                };
                GameState.state.portfolio.push(acquiredWork);
                GameState.state.totalWorksBought = (GameState.state.totalWorksBought || 0) + 1;
                GameState.addNews(`🤝 Haggled and bought "${h.work.title}" for $${h.finalPrice.toLocaleString()} (saved $${(h.askingPrice - h.finalPrice).toLocaleString()})`);
            } else {
                // Sell: add cash, remove from portfolio, track flip history
                GameState.state.cash += h.finalPrice;
                GameState.state.portfolio = GameState.state.portfolio.filter(w => w.id !== h.work.id);
                GameState.state.totalWorksSold = (GameState.state.totalWorksSold || 0) + 1;

                // Flip tracking — mirrors GameState.sellWork() logic
                const holdTime = GameState.state.week - (h.work.purchaseWeek || 0);
                GameState.state.flipHistory = GameState.state.flipHistory || [];
                GameState.state.flipHistory.push({
                    workId: h.work.id,
                    buyWeek: h.work.purchaseWeek || 0,
                    sellWeek: GameState.state.week,
                    holdTime,
                });

                GameState.addNews(`💰 Sold "${h.work.title}" for $${h.finalPrice.toLocaleString()}`);
            }

            // Reputation boost for successful deals
            GameState.state.reputation = Math.min(100, GameState.state.reputation + 1);
        } else {
            // Walk away — minor heat from wasted time
            GameState.addNews(`❌ Haggle over "${h.work.title}" fell through.`);
        }

        const result = {
            mode: h.mode,
            result: h.result,
            finalPrice: h.finalPrice,
            work: h.work,
            dealerName: h.dealerName,
            rounds: h.rounds.length,
        };

        this.active = null;
        return result;
    }

    // ════════════════════════════════════════════
    // Private helpers
    // ════════════════════════════════════════════

    _getDialogue(key) {
        if (!this.active) return '"..."';
        const pool = DEALER_DIALOGUE[key]?.[this.active.dealerTypeKey];
        if (!pool || pool.length === 0) return '"..."';
        const line = pool[Math.floor(Math.random() * pool.length)];

        // Replace template tokens
        return line
            .replace('%PERCENT%', `${Math.round((this.active.gap / this.active.askingPrice) * 100)}%`)
            .replace('%GAP%', `${this.active.gap.toLocaleString()}`);
    }

    _randomDealerType() {
        const keys = Object.keys(DEALER_TYPES);
        return keys[Math.floor(Math.random() * keys.length)];
    }
}

export const HaggleManager = new _HaggleManager();
